/*!
 * Start Bootstrap - Grayscale Bootstrap Theme (http://startbootstrap.com)
 * Code licensed under the Apache License v2.0.
 * For details, see http://www.apache.org/licenses/LICENSE-2.0.
 */

 $(document).ready(function(){
     $("#copCap").hide();
     $(".toggle").click(function(){
         $(".iframe").toggle();
       });

    $("#subCap").click(function(){
      if($("#emailSpace").text() == "zachary.miller.psu@gmail.com"){
        $("#copCap").hide();
        $("#emailSpace").hide();
        $("#emailSpace").html("");
        $("#subCap").html("Show Contact Information")
      } else {
        $("#copCap").show();
        $("#emailSpace").show();
        $("#subCap").html("Hide Contact Information")
        $("#emailSpace").html("zachary.miller.psu@gmail.com");
      }
    })

    $("#copCap").click(function(){
        var $temp = $("<input>");
        $("body").append($temp);
        $temp.val($("#emailSpace").text()).select();
        document.execCommand("copy");
        $temp.remove();
        console.log($("#emailSpace").text());
    });
});

function audioClick(track){
  console.log(track)
  var trackName = track + "Audio";
  var element = document.getElementById(trackName);
  if (element.paused) {
    for(var i = 1; i < 5; i++){
      var temp = "track"+i+"Audio";
      var tempElement = document.getElementById(temp);
      tempElement.pause();
      tempElement.currentTime = 0;
    }
    element.play();
  } else {
    element.pause();
    element.currentTime = 0;
  }
}
// jQuery to collapse the navbar on scroll
function collapseNavbar() {
    if ($(".navbar").offset().top > 50) {
        $(".navbar-fixed-top").addClass("top-nav-collapse");
    } else {
        $(".navbar-fixed-top").removeClass("top-nav-collapse");
    }
}

$(window).scroll(collapseNavbar);
$(document).ready(collapseNavbar);

// jQuery for page scrolling feature - requires jQuery Easing plugin
$(function() {
    $('a.page-scroll').bind('click', function(event) {
        var $anchor = $(this);
        $('html, body').stop().animate({
            scrollTop: $($anchor.attr('href')).offset().top
        }, 1500, 'easeInOutExpo');
        event.preventDefault();
    });
});

// Closes the Responsive Menu on Menu Item Click
$('.navbar-collapse ul li a').click(function() {
    $(".navbar-collapse").collapse('hide');
});
