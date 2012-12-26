var AppRouter = Backbone.Router.extend({

	routes: {
	    ""                 : "home",
	    "about"             : "about",
	    "graph"             : "graph"
	},

	initialize: function () {
	    document.addEventListener('deviceready', function() {
		    window.utils.showAlert("Device", "Detected", "alert-success");
		});
	    
	    this.navbarView = new NavigationView({ templateSelector: '#navbarview',
						   targetSelector: '#navbar' });
	    this.navbarView.render();

	    this.sidebarView = new NavigationView({ templateSelector: '#sidebarview',
						    targetSelector: '#sidebar' });
	    this.sidebarView.render();
	},
    
	home: function () {
	    if (!this.homeView) {
		this.homeView = new ContentView({ templateSelector: '#homeview',
						  targetSelector: '#content' });
	    }
	    this.homeView.render();
	    this.navbarView.selectMenuItem('home');
	    this.sidebarView.selectMenuItem('home');
	},
    
	about: function () {
	    if (!this.aboutView) {
		this.aboutView = new ContentView({ templateSelector: '#aboutview',
						   targetSelector: '#content' });
	    }
	    this.aboutView.render();
	    this.navbarView.selectMenuItem('about');
	    this.sidebarView.selectMenuItem('about');
	},

	graph: function () {
	    if (!this.graphView) {
		this.graphView = new ContentView({ templateSelector: '#graphview',
						   targetSelector: '#content' });
	    }
	    this.graphView.render();
	    this.navbarView.selectMenuItem('graph');
	    this.sidebarView.selectMenuItem('graph');
	},

    });

{
    // Load the client side include templates
    var deferreds = [];
    $(".client-side-include").each(function(){
            var inc=$(this);
            deferreds.push($.get(inc.attr("src"), function(data){ inc.replaceWith(data); }));
	});
    
    // Start the Backbone Application
    $.when.apply(null, deferreds).done(function() {
	    window.utils.showAlert("Device", "Detection In Progress", "alert-info");
	    window.setTimeout(function() { 
		    window.setTimeout(function() { window.utils.hideAlert() });
		}, 10000);
	    
	    app = new AppRouter();
            Backbone.history.start();
        });        
}    
