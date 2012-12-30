/**
 * @author David Wang <dcwangmit01 at gmail dot com>
 * 
 * @requires jQuery
 * @requires sprintf
 * @requires backbone
 * @requires d3
 * @requires nvd3
 *
 * @fileOverview This file contains everything Racksapce Related.
 * - Rackspace Authentication and Graphing Object
 * - Rackspace Backbone Models which read Entity, Check, and Metric objects from the API
 * - Metric View Renderers
 */

"use strict";


/**
 * @class Rackspace Authentication and Graphing Object
 */
var Rax = function initialize (username, password, options) {
    /**
     * @description Created using the "Module Export" Pattern described here:
     *   http://www.adequatelygood.com/2010/3/JavaScript-Module-Pattern-In-Depth
     */

    // this self
    var my = {};

    // parse input options
    var defaults = {
	/**
	 * Set the urlRewriteFunc to return the identity if is not
	 * defined.  This might be used to rewrite a url for cross
	 * domain proxies.
	 *
	 * @function
	 */
	urlRewriteFunc: function(data) { return data; }, // identity
	authUrl: 'https://identity.api.rackspacecloud.com/v2.0/tokens', // default to US
    };
    my.options = $.extend(defaults, options);
    
    // private variables
    var auth_response = null;

    // public variables
    my.username = username;
    my.password = password;
    my.tenantid = null;
    my.token = null;
    my.auth_successful = false;

    /**
     * @description Sets custom HTTP headers for requests to Rackspace
     * APIs, by using information fetched from the initial auth
     * request.  This method can be passed as an argument to the
     * $.ajax call.
     * 
     * @param {xhr} XMLHttpRequest Object.
     * @return Nothing
     */
    my.setHeader = function(xhr) {
	xhr.setRequestHeader('Content-Type', 'application/json');
	xhr.setRequestHeader('Accept', 'application/json');
	if (my.tenantid != null && my.tenantid != "") {
	    xhr.setRequestHeader('X-Auth-Project-Id', my.tenantid);
	}
	if (my.token != null && my.token != "") {
	    xhr.setRequestHeader('X-Auth-Token', my.token);
	}
    }
    
    /**
     * @description Initiates an authentication request to the
     * Keystone Auth server.
     * 
     * @return A deferred object
     */
    my.authenticate = function(options) {

	// parse input options
	var defaults = {
	    doneCallback: function() { return; }, // no-op
	    failCallback: function() { return; }, // no-op
	};
	var options = $.extend(defaults, options);

	var payload = { auth: { tenantName: my.tenantid, 
				passwordCredentials: { username: my.username, password: my.password}}};

	return $.ajax( { url: my.options.urlRewriteFunc(my.options.authUrl),
		    type: 'POST',
		    data: JSON.stringify(payload),
		    dataType: 'json',
		    beforeSend: my.setHeader,
		    })
	.done(function(data) { 
		auth_response = data;
		my.tenantid = data.access.token.tenant.id;
		my.token = data.access.token.id;
		my.auth_successful = true;
		options.doneCallback();
	    })
	.fail(function(data) {
		auth_response = null;
		my.tenantid = null;
		my.token = null;
		my.auth_successful = false;
		options.failCallback();
	    });
    }

    /**
     * @description Graphs a metric to an SVG container
     * 
     * @param {domSelector} The SVG Container where the graph should be rendered
     * @param {entityid} entity id "enXXXXXX"
     * @param {checkid} check id "chXXXXXX"
     * @param {metricid} metric id "mzXXX.<metricname>"
     *
     * @return A deferred object
     */
    my.graphMetric = function(domSelector, entityid, checkid, metricid, options) {
	
	// parse input options
	var defaults = {
	    numPoints: 256,
	    lookBehindSeconds: 60*60*24,
	    width: '100%',
	    height: '100%',
	    doneCallback: function() { return; }, // no-op
	    failCallback: function() { return; }, // no-op
	};
	var options = $.extend(defaults, options);

	var currentTimeMs = new Date().getTime();
	
	return $.ajax( { url: my.options.urlRewriteFunc
		    (sprintf('https://monitoring.api.rackspacecloud.com/v1.0/%s/entities/%s/checks/%s/metrics/%s/plot?points=%s\&from=%s\&to=%s',
			     my.tenantid, entityid, checkid, metricid,
			     options.numPoints, currentTimeMs-1000*options.lookBehindSeconds, currentTimeMs)),
		    type: 'GET',
		    beforeSend: my.setHeader
		    })
	.done(function(data) {
		nv.addGraph(function() {
			function processData(data) {
			    var res = $.map(data.values, function(row) {
				    return { x: Math.floor(row.timestamp/1000/60), y: row.average };
				});
			    return [{ values: res,
					key: my.metricid,
					color: '#ff7f0e'
					}];
			};
			
			var chart = nv.models.multiBarChart();
			chart.xAxis
			    .axisLabel('Time since Epoch (ms)')
			    .tickFormat(d3.format('3,3f'));
			
			chart.yAxis
			    .axisLabel(my.metricid)
			    .tickFormat(d3.format(',6f'));
			
			d3.select(domSelector)
			    .attr("width", options.width)
			    .attr("height", options.height)
			    .datum(processData(data))
			    .transition().duration(500)
			    .call(chart);
			nv.utils.windowResize(chart.update);
			return chart;
		    });
		options.doneCallback();
	    })
	.fail(function(data) {
		options.failCallback();
	    });
    };
        
    return my;
};


/**
 * @class Rackspace Backbone Entity Model
 */
var Entity = Backbone.Model.extend({});

/**
 * @class Rackspace Backbone Entity Container
 */
var EntityList = Backbone.Collection.extend({
	model: Entity,
	initialize: function(options) {
	    this.options = options;
	},
	parse: function(data) {
	    return data.values;
	},
	url: function() { return this.options.rax.options.urlRewriteFunc
			  ("https://monitoring.api.rackspacecloud.com/v1.0/"+this.options.rax.tenantid
			   +"/entities"); },
	fetchRecursive: function(fetchOptions) {
	    var $this = this;
	    return this.fetch(fetchOptions)
	    .then(function() {
		    var entityList = $this;
		    var rax = $this.options.rax;
		    var deferreds = [];
		    entityList.each(function(entity) {
			    var checkList = new CheckList( { rax: rax, entity: entity } );
			    deferreds.push(checkList.fetchRecursive({ beforeSend: rax.setHeader }));
			    entity.set('checkList', checkList);
			});
		    return $.when.apply(null, deferreds);
		});
	},
    });


/**
 * @class Rackspace Backbone Check Model
 */
var Check = Backbone.Model.extend({});

/**
 * @class Rackspace Backbone Check Container
 */
var CheckList = Backbone.Collection.extend({
	model: Check,
	url: function() { return this.options.rax.options.urlRewriteFunc
			  ("https://monitoring.api.rackspacecloud.com/v1.0/"+this.options.rax.tenantid+
			   "/entities/"+this.options.entity.id+"/checks"); },
	parse: function(data) {
	    return data.values;
	},
	initialize: function(options) {
	    this.options = options;
	},
	fetchRecursive: function(fetchOptions) {
	    var $this = this;
	    return this.fetch(fetchOptions)
	    .then(function() {
		    var checkList = $this;
		    var rax = $this.options.rax;
		    var entity = $this.options.entity;
		    var deferreds = [];
		    checkList.each(function(check) {
			    var metricList = new MetricList( { rax: rax, entity: entity, check: check } );
			    deferreds.push(metricList.fetch({ beforeSend: rax.setHeader }));
			    check.set('metricList', metricList);
			});
		    return $.when.apply(null, deferreds);
		});
	},
    });

/**
 * @class Rackspace Backbone Metric Model
 */
var Metric = Backbone.Model.extend({});

/**
 * @class Rackspace Backbone Metric Container
 */
var MetricList = Backbone.Collection.extend({
	model: Metric,
	initialize: function(options) {
	    this.options = options;
	},
	parse: function(data) {
	    return data.values;
	},
	url: function() { return this.options.rax.options.urlRewriteFunc
			  ("https://monitoring.api.rackspacecloud.com/v1.0/"+this.options.rax.tenantid+
			   "/entities/"+this.options.entity.id+"/checks/"+this.options.check.id+"/metrics"); },
    });



/**
 * @class Rackspace Backbone Metric Option View
 */
var MetricOptionView = Backbone.View.extend({
	template: '#tpl_metric_option',
	render:function (eventName) {
	    $(this.el).html(_.template($(this.template).html(), this.options, {variable: 'data'}));
	    return this.el;
	}
    });
 
/**
 * @class Rackspace Backbone Metric Select View
 */
var MetricSelectView = Backbone.View.extend({
	tagName:'select',
	initialize:function () {
	},
	render:function (eventName) {
	    var $this = this;
	    var entityList = this.options.entityList;
	    entityList.each(function(entity) {
		    entity.get('checkList').each(function(check) {
			    check.get('metricList').each(function(metric) {
				    var v = new MetricOptionView
					({ entity: entity,
					   check: check,
					   metric: metric,
					 });
				    $($this.el).append(v.render());
				});
			});
		});
	    return this.el;
	},
    });



