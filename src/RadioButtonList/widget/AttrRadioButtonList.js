/*jslint white:true, nomen: true, plusplus: true */
/*global mx, define, require, browser, devel, console, document, jQuery, mxui */
/*mendix */

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
		"dojo/_base/declare",
		"mxui/widget/_WidgetBase",
		"dijit/_TemplatedMixin",
		"mxui/dom",
		"dojo/dom-class",
		"dojo/dom-style",
		"dojo/dom-construct",
		"dojo/dom-attr",
		"dojo/_base/lang",
		"dojo/html",
	"dojo/text!RadioButtonList/widget/template/RadioButtonList.html"
	], function (declare, _WidgetBase, _TemplatedMixin, dom,  dojoClass, dojoStyle, dojoConstruct, dojoAttr, dojoLang, dojoHtml, widgetTemplate) {
	"use strict";

	// Declare widget's prototype.
	return declare("RadioButtonList.widget.AttrRadioButtonList", [_WidgetBase, _TemplatedMixin], {
		// _TemplatedMixin will create our dom node using this HTML template.
		templateString: widgetTemplate,

		// DOM elements
		inputNodes: null,

		// Parameters configurable in Business Modeler.
		entity: null,
		direction: "vertical",
		captiontrue: "",
		captionfalse: "",
		readonly: false,
		onchangeAction: "",

		// Internal variables. Non-primitives created in the prototype are shared between all widget instances.
		_handles: null,
		_contextObj: null,
		_alertDiv: null,
		_radioButtonOptions: null,

		// dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
		constructor: function () {
			this._handles = [];
		},

		// dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
		postCreate: function () {
			console.debug(this.id + ".postCreate");

			if (this.readOnly || this.get('disabled') || this.readonly) {
				//this.readOnly isn't available in client API, this.get('disabled') works correctly since 5.18.
				this._isReadOnly = true;
			}
			
			this._reserveSpace();
		},

		// mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
		update: function (obj, callback) {
			console.debug(this.id + ".update");

			this._contextObj = obj;
			this._resetSubscriptions();
			this._setRadiobuttonOptions();
			this._updateRendering();

			callback();
		},

		// mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
		enable: function () {},

		// mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
		disable: function () {},

		// mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
		resize: function (box) {},

		// mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
		uninitialize: function () {
			// Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
		},

		// Rerender the interface.
		_updateRendering: function () {

			if (this._contextObj !== null) {
				dojoStyle.set(this.domNode, "display", "block");

				this._createRadiobuttonNodes();

			} else {
				dojoStyle.set(this.domNode, "display", "none");
			}

			// Important to clear all validations!
			this._clearValidations();
		},

		// Handle validations.
		_handleValidation: function (validations) {
			this._clearValidations();

			var validation = validations[0],
				message = validation.getReasonByAttribute(this.entity);

			if (this._isReadOnly ||
				this._contextObj.isReadonlyAttr(this.entity)) {
				validation.removeAttribute(this.entity);
			} else if (message) {
				this._addValidation(message);
				validation.removeAttribute(this.entity);
			}
		},

		// Clear validations.
		_clearValidations: function () {
			dojoConstruct.destroy(this._alertDiv);
			this._alertDiv = null;
		},

		// Show an error message.
		_showError: function (message) {
			if (this._alertDiv !== null) {
				dojoHtml.set(this._alertDiv, message);
				return true;
			}
			this._alertDiv = dojoConstruct.create("div", {
				"class": "alert alert-danger",
				"innerHTML": message
			});
			dojoConstruct.place(this._alertDiv, this.domNode);
		},

		// Add a validation.
		_addValidation: function (message) {
			this._showError(message);
		},

		// Reset subscriptions.
		_resetSubscriptions: function () {
			
			var validationHandle = null, objectHandle = null, attrHandle = null;
			
			// Release handles on previous object, if any.
			if (this._handles) {
				this._handles.forEach(function (handle) {
					mx.data.unsubscribe(handle);
				});
				this._handles = [];
			}

			// When a mendix object exists create subscribtions. 
			if (this._contextObj) {
				validationHandle = this.subscribe({
					guid     : this._contextObj.getGuid(),
					val      : true,
					callback : dojoLang.hitch(this, this._handleValidation)
				});

				objectHandle = this.subscribe({
					guid     : this._contextObj.getGuid(),
					callback: dojoLang.hitch(this, function (guid) {
						this._updateRendering();
					})
				});

				attrHandle = this.subscribe({
					guid    : this._contextObj.getGuid(),
					attr    : this.entity,
					callback: dojoLang.hitch(this, function (guid, attr, attrValue) {
						this._updateRendering();
					})
				});

				this.handles = [validationHandle, objectHandle, attrHandle];
			}
		},

		_setRadiobuttonOptions: function () {
			if (this.entity !== "" && this._contextObj) {
				//get enumeration for current attribute
				if(this._contextObj.getAttributeType(this.entity) === "Enum") {
					this._radioButtonOptions = this._contextObj.getEnumKVPairs(this.entity);
				} else if(this._contextObj.getAttributeType(this.entity) === "Boolean") {
					this._radioButtonOptions = {};
					this._radioButtonOptions["true"] = this.captiontrue;
					this._radioButtonOptions["false"] = this.captionfalse;
				}
			}
		},

		_createRadiobuttonNodes: function () {

			var labelNode = null,
				radioButtonNode = null,
				i = 0, j =0,
				nodelength = null,
				enclosingDivElement = null;

			nodelength = this.inputNodes.children.length;
			
			if(this.direction === "horizontal") {
				dojoConstruct.empty(this.inputNodes);
			}
			
			for (var option in this._radioButtonOptions) {
				if (this._radioButtonOptions.hasOwnProperty(option)) {

					labelNode = this._createLabelNode(option, this._radioButtonOptions[option]);
					radioButtonNode = this._createRadiobuttonNode(option, this._radioButtonOptions[option]);

					dojoConstruct.place(radioButtonNode, labelNode, "first");
					
					if(this.direction === "horizontal"){
						dojoConstruct.place(labelNode, this.inputNodes, "last");
					} else {
						//an enclosing div element is required to vertically align a radiobuttonlist in bootstrap. 
						if(this.inputNodes.children[i])	{
							enclosingDivElement = this.inputNodes.children[i];
						}
						else
						{
							enclosingDivElement = dojoConstruct.create("div", {"class" : "radio"});
						}
						if(enclosingDivElement.children[0]) {
							dojoConstruct.destroy(enclosingDivElement.children[0]);
						}
						
						dojoConstruct.place(labelNode, enclosingDivElement, "only");
						if(!this.inputNodes.children[i]) {
							dojoConstruct.place(enclosingDivElement, this.inputNodes, "last");
						}
					}
					
					i++;
				}
			}
			
			j= i;
			if(j>0) {
				for(j; j <= nodelength; j++)
				{
					dojoConstruct.destroy(this.inputNodes.children[i]);
				}
			}
			
		},

		_createLabelNode: function (key, value) {

			var labelNode = null;

			labelNode = dojoConstruct.create("label");

			if (this._isReadOnly || 
				this._contextObj.isReadonlyAttr(this.entity)) {
				dojoAttr.set(labelNode, "disabled", "disabled");
				dojoAttr.set(labelNode, "readonly", "readonly");
			}

			if ("" + this._contextObj.get(this.entity) === key) {
				dojoClass.add(labelNode, "checked");
			}
			
			if(this.direction === "horizontal"){
				dojoClass.add(labelNode, "radio-inline");
			}

			dojoConstruct.place(dojoConstruct.create("span", {
				"innerHTML": value
			}), labelNode );

			return labelNode;
		},

		_createRadiobuttonNode: function (key, value, index) {
			var radiobuttonNode = null;

			radiobuttonNode = dojoConstruct.create("input", {
				"type": "radio",
				"value": key,
				"id": this.entity + "_" + this.id + "_" + index
			});

			dojoAttr.set(radiobuttonNode, "name", "radio" + this._contextObj.getGuid() + "_" + this.id);

			if (this._isReadOnly || 
				this._contextObj.isReadonlyAttr(this.entity)) {
				dojoAttr.set(radiobuttonNode, "disabled", "disabled");
				dojoAttr.set(radiobuttonNode, "readonly", "readonly");
			}

			if ("" + this._contextObj.get(this.entity) === key) {
				dojoAttr.set(radiobuttonNode, "defaultChecked", true);
			}

			this._addOnclickToRadiobuttonItem(radiobuttonNode, key);
			
			return radiobuttonNode;
		},

		_addOnclickToRadiobuttonItem: function (radiobuttonNode, rbvalue) {

			this.connect(radiobuttonNode, "onclick", dojoLang.hitch(this, function () {

				var selectedValue = null;
				
				if (this._isReadOnly || 
					this._contextObj.isReadonlyAttr(this.entity)) {
					return;
				}

				dojoAttr.set(radiobuttonNode, "checked", true);
				
				if("Boolean" == this._contextObj.getAttributeType(this.entity)){ 
					rbvalue = rbvalue == "true";
				}
				
				this._contextObj.set(this.entity, rbvalue);
				
				if (this.onchangeAction) {
					mx.data.action({
						params          : {
							applyto     : "selection",
							actionname  : this.onchangeAction,
							guids       : [this._contextObj.getGuid()]
						},
						error           : function(error) {
							console.log("RadioButtonList.widget.AttrRadioButtonList._addOnclickToRadiobuttonItem: XAS error executing microflow; " + error.description);
						}
					});			
				}
			}));
		},
		_reserveSpace : function ()
		{
			var i = 0;
			for (i; i<10; i++) {
				dojoConstruct.place(dojoConstruct.create("div", {"class" : "radio", innerHTML: "&nbsp;"}),this.inputNodes);
			}
	   	}
	});
	
});

require(["RadioButtonList/widget/AttrRadioButtonList"], function () {
	"use strict";
});