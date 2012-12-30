window.ContentView = Backbone.View.extend({
	
	initialize: function (options) {
	    this.options = options;
	},
	
	render: function () {
	    var template = $(this.options.templateSelector).text();
	    var processed = _.template(template, null);
	    $(this.options.targetSelector).html(processed);
	},

    });


window.NavigationView = window.ContentView.extend({
	
	selectMenuItem: function (menuItem) {
	    $('.nav li').removeClass('active');
	    if (menuItem) {
		$('.' + menuItem).addClass('active');
	    }
	}
    });
