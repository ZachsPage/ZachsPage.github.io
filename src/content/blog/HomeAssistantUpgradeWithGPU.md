---
title: "Weekend Project: HomeAssistant Upgrade - Frigate NVR with GPU Detection"
description: "Upgrading my Proxmox & HomeAssistant setup"
pubDate: 2026-02-01
---

A couple years ago, running a self-hosted `HomeAssistant` instance to support a couple cameras piqued my interest.  
This stemmed from a mixture of two things:
- Despising subscription services
- Not being comfortable with my "encrypted" video streams going to some company's servers before coming to me

My first step was grabbing an `HP Prodesk 600 G2` - the "small form factor" model (foreshadowing) - from Ebay.  
Running a `Proxmox` hypervisor with a `HassOS` (HomeAssistantOS) VM, once HTTPS & two-factor authentication was set up, I could view camera streams from outside of my home network.

But recently, I also wanted recording capabilities triggered by object detection - so it was GPU time.  
Here's a small write-up from my experience & surprises I faced - disclaimer: this is not a tutorial, but could be helpful!

### Hardware

I ordered a cheap low profile GTX 1050 which I read would fit into my small form factor `Prodesk`.

When the GPU arrived, I held it next to my desktop and realized - oops - I didn't actually have the "small form factor" `SFF` model, but the even smaller "desktop mini" `DM` version.

So back to Ebay to find an actual `SFF Prodesk`. For < $100 there was one with a 500GB SSD + 1TB HDD - which was perfect for separate OS / recording storage drives. Sure, upon arrival `smartctl` showed the HDD had 86k power-on hours, but I'm sure double its expected life is okay (/s).
But, the SSD had 1/8th of those power-on hours & 70% life left, so not a total waste.

For the cameras, grabbed two `Tapo C120`s & non-destructively mounted them using vinyl-siding hooks with pre-drilled holes.

### Software - Hypervisor & Container Setup

This is where much more changed than expected.

Before, my `HassOS VM` was running the `Frigate Full Access` addon - easy, I thought, just pass the GPU through!
Of course, the new PC's BIOS only had an option `VT-x`, not `VT-d` for directed passthrough - problem 1.
After scouring some forums, you could change the hidden option by exporting / re-importing a text file for the BIOS options.
Once that was set, I hit the next problem - `HassOS` does not have Nvidia drivers, so the Frigate addon obviously can't use the passed through GPU.

The next option was to run `Frigate` in a Docker container directly on the `Proxmox` host - not ideal, but good enough for my limited hardware.
Getting the Nvidia drivers on `Proxmox` `pveversion` -> 9.1.1 was a pain:
- After DNS & apt package sources issues, what ended up working was a very recent version of Nvidia drivers due to the newer 6.17 Linux kernel
- Could have downgraded to an older `Proxmox` version, but where's the fun in that
- Until ending up with Nvidia 580 driver, running `nvidia-smi` was not detecting the card - but this worked:

```bash collapse={1-5}
apt remove --purge nvidia-*
apt autoremove
reboot
apt install build-essential pkg-config libglvnd-dev
driver_install="NVIDIA-Linux-x86_64-580.82.09.run"
wget https://us.download.nvidia.com/XFree86/Linux-x86_64/580.82.09/${driver_install}
chmod +x ${driver_install} && ./${driver_install}
```
- Now we're cooking, `nvidia-smi` shows my card! So let's add `Docker` into the mix & get it to see the card too:
```shell collapse={1-6}
# Install nvidia-container-toolkit - https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
apt update
apt install nvidia-container-toolkit

# Install Docker & configure it to use NVIDIA runtime - then test it
curl -fsSL https://get.docker.com | sh
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker
docker run --rm --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi
``` 
- Should show something like:
```shell
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 580.126.09             Driver Version: 580.126.09     CUDA Version: 13.0     |
+-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  NVIDIA GeForce GTX 1050        Off |   00000000:01:00.0 Off |                  N/A |
```

### Software - Storage & Frigate

The SSD was where `Proxmox` was installed, so time to persistently mount the HDD for `Frigate`'s storage:
```bash
mount_point="/mnt/hdd_1tb"
mkdir -p "${mount_point}" # make mount point
blkid /dev/sda1 # get device blkid_uuid & blkid_type
vi /etc/fstab # to append the below line - "file system table" 
# Args: 0=dump (no backup) 2=pass (fsck) file system check at boot
UUID="${blkid_uuid}" ${mount_point} ${blkid_type} defaults 0 2 
mount -a # mount all - verify works before reboot
```

Let's add a new `systemd` service to start the `Frigate` container at startup:
```bash collapse={6-15}
# /etc/systemd/system/frigate.service
[Unit]
Description=Frigate Docker Compose
Requires=docker.service
After=docker.service
[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/homeassistant/frigate/
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
[Install]
WantedBy=multi-user.target
```
Then run `systemctl daemon-reload && systemctl enable frigate.service`

The service would launch this:
```yaml collapse={6-25}
# /opt/homeassistant/frigate/docker-compose.yml
services:
  frigate:
    container_name: frigate
    image: ghcr.io/blakeblackshear/frigate:stable-tensorrt
    restart: unless-stopped
    shm_size: 384m
    privileged: true # had stream issues otherwise - should probably work this out
    ports:
      - 5000:5000
      - 8554:8554
      - 8555:8555/tcp
      - 8555:8555/udp
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    volumes:
      - /etc/localtime/:/etc/localtime/:ro # share host time
      - /opt/homeassistant/frigate/config/:/config/
      - /mnt/hdd_1tb/frigate/:/media/frigate/
```

Which mounted in my `Frigate` config:
```yaml collapse={1-8, 18-40}
# /opt/homeassistant/frigate/config/config.yml
version: 0.16-0
mqtt:
  enabled: true
  host: ${HA_MQTT_IP}
  port: ${HA_MQTT_PORT}
  user: ${HA_MQTT_USER}
  password: ${HA_MQTT_PASS}
ffmpeg:
  hwaccel_args: preset-nvidia
detectors:
  onnx:
    type: onnx
model:
  path: /config/model_cache/yolov8s.onnx # more on this later
  model_type: yolo-generic
  input_dtype: float
  input_tensor: nchw
  input_pixel_format: rgb
  width: 640
  height: 640
objects:
  track:
    - person
record:
  enabled: true
  detections:
    retain:
      days: 14
cameras:
  tapocam_1:
    ffmpeg:
      inputs:
        - path: rtsp://${TAPO_1_USER}:${TAPO_1_PASS}@${TAPO_1_IP_N_PORT}/stream1
    detect:
      enabled: true
  tapocam_2:
    ffmpeg:
       ...
```

For the `Frigate` detection model `/config/model_cache/yolov8s.onnx`:
- It seems that in the `Frigate` documentation, there are some old things that no longer work - ex. it seems
  `Deci AI` was acquired by Nvidia and no longer supplies the models
- I had trouble generating `onnx` version of `yolov9` as well, but `yolov8` worked
- So went with its `small` model & generated the `.onnx` model format needed by `Frigate`:
  - `python3 -m venv .venv && ./.venv/bin/pip install ultralytics`
    ```python
    # gen_model.py
    from ultralytics import YOLO
    model = YOLO('yolov8s.pt')
    model.export(format='onnx', imgsz=640, simplify=True, opset=12)
    ```
  - `./.venv/bin/python ./gen_model.py` -> `scp` the `.onnx` output into `Frigate`'s `config` directory

### At Last

Finally all working! But I had a small issue with the `Frigate HassOS integration` & `display cards`:
- The `Frigate` camera stream was live on the `HassOS` display, but the refresh rate was much slower than my other `RTSP` stream.
  But, switching to the direct `RTSP` `display card` was not "live" - even with the "preload" option on
- The solution was to add a `Picture Glance` card set to "Live" view, and use the direct `RTSP` entity instead of the `Frigate` one
