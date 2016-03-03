$(document).ready(function(){
    
    
    /**
     * The window is redirected to the /auth/spotify endpoint when the landing page buttons are clicked.
     */ 
    $('.navSignIn').on('click', function(){
        
        window.location.href='/auth/spotify';
        
    });

});
