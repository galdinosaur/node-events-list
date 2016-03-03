$(document).ready(function(){

    /**
     * This function will fire off when the userFollowedArtist endpoint is called with jquery ajax.
     * @param {object} results - This is the artist event information object sent from the server.
     */ 
    var viewResults = function(results){

      console.log('inside the viewResults function',results);
      
      for(var i = 0; i < results.events.length; i++){
        
        var piece = results.events[i];
        var name = piece.name;
        var event = piece.event;
        var location = piece.location;
        var date = piece.date;
        var url = piece.url;
        
        $('.resultsBody').append('<tr> <td>'+name+'</td><td>'+event+'</td><td>'+location+'</td><td>'+date+'</td><td>'+url+'</td></tr>');
        
      }
      
    };
    
    /**
     * This function can be used to sort the results object based on the date.
     * @param {object} resultsObject - The received object from the server.
     */ 
    // var eventsDateSort = function(resultsObject){
      
    //   resultsObject.sort(function(a,b){

    //     var aa = a.date.split('/'),
    //     bb = b.date.split('/');
        
    //     aa = [aa[2],aa[0], aa[1]],
    //     bb = [bb[2],bb[0],bb[1]];
        
    //     var cc = parseInt(aa.join(''));
    //     var dd = parseInt(bb.join(''));

    //     return cc < dd ? -1 : (cc > dd ? 1 : 0);
    //   });
    // }
    
    
    /**
     * This function can be used to sort the results object based on the alphabetical order.
     * @param {object} resultsObject - The received object from the server.
     */  
    // var EventsAlphSort = function(resultsObject){
    //   resultsObject.sort(function(a,b){
        
    //     var aName = a.name.toLowerCase(),
    //     bName = b.name.toLowerCase();
        
    //     return aName < bName ? 1 : (aName > bName ? -1 : 0);
        
    //   });
    // }
    
    
    /**
     * Jquery qjax call to the /userfollowedArtist enpoint to my server. This ajax call is fired immediately when
     * when the DOM is ready for scipting, which is when the server is going to get the entire list of the events of
     * the users followed artists.
     */ 
    $.get( "/userFollowedArtists", function() {
      alert('it worked');
    })
    .done(function(data) {
      alert( "second success" ); 
      var result = data;
      viewResults(result);
      console.log(result);
    })
    .fail(function() {
      alert( "error" );
    });


});

var mapsToDashboardLat,
    mapsToDashboardLong;


/**
 * This function calls the /artistLocationSearch endpoint and receives an object of events per location. The
 * location is based on the lat and long parameters.
 * @param {number} lat - latitude coordinates.
 * @param {number} long - longitude coordinates.
 */
var locationEventSearch = function(lat, long){
  $.ajax({
    url: "/artistLocationSearch",
    type: "get",
    data:{lat:lat, long: long},
    success: function(response) {
      console.log('yay this worked', response);
      
      $('.resultsBody').empty();
      
      for(var n = 0; n < response.located.length;n++){
        
        $('.resultsBody').append('<tr> <td>'+response.located[n].name+'</td><td>'+response.located[n].event+'</td><td>'+response.located[n].location+'</td><td>'+response.located[n].date+'</td><td>'+response.located[n].url+'</td></tr>');
        
      }
    },
    error: function(xhr) {
      console.log(xhr);
    }
  });

};

/**
 * This is the google maps autocomplete function which is called from the html google script tag. This function
 * needs to be outside of the document.ready function because the html script tag is called before the DOM is
 * completely ready for scriping.
 */ 
function locationAutocomplete() {

  var input = /** @type {!HTMLInputElement} */
  (document.getElementById('pac-input'));

  var autocomplete = new google.maps.places.Autocomplete(input);
  
  autocomplete.addListener('place_changed', function() {
    var place = autocomplete.getPlace();
    mapsToDashboardLat =  place.geometry.location.lat();
    mapsToDashboardLong = place.geometry.location.lng();

    locationEventSearch(mapsToDashboardLat, mapsToDashboardLong);

    if (!place.geometry) {
      window.alert("Autocomplete's returned place contains no geometry");
      return;
    }

  });

}