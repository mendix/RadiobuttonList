/*jslint white:true, nomen: true, plusplus: true */
/*global mx, define, require, browser, devel, console, document, jQuery, mxui, dojo */
/*mendix */
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "mxui/dom",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/html",
    "dojo/text!RadioButtonList/widget/template/RadioButtonList.html"
],
    function (declare, _WidgetBase, _TemplatedMixin, dom, dojoClass, dojoStyle, dojoConstruct, dojoAttr, dojoArray, dojoLang, dojoHtml, widgetTemplate) {
        "use strict";

        // Declare widget.
        return declare("RadioButtonList.widget.AssocRadioButtonList", [_WidgetBase, _TemplatedMixin], {

            // Template path
            templateString: widgetTemplate,

            // DOM elements
            inputNodes: null,

            // Parameters configurable in Business Modeler.
            dataSourceType: null,
            RadioListObject: null,
            Constraint: "",
            sortAttr: "",
            sortOrder: false,
            RadioListItemAttribute: "",
            entity: null,
            direction: "vertical",
            readonly: false,
            onchangeAction: "",
            formOrientation: null,

            // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
            _handles: null,
            _contextObj: null,
            _alertDiv: null,
            _radioButtonOptions: null,
            _isReadOnly: false,
            _assocName: null,
            _locatedInListview: false,

            /**
             * Mendix Widget methods.
             * ======================
             */
            constructor: function () {
                //logger.level(logger.DEBUG);
                this._handles = [];
            },

            // DOJO.WidgetBase -> PostCreate is fired after the properties of the widget are set.
            postCreate: function () {
                logger.debug(this.id + ".postCreate");

                this._assocName = (typeof this.entity !== "undefined" && this.entity !== "") ? this.entity.split("/")[0] : "";
                this.entity = this._assocName; //to catch data validation

                if (this.readOnly || this.get("disabled") || this.readonly) {
                    //this.readOnly isn't available in client API, this.get("disabled") works correctly since 5.18.
                    //this.readonly is a widget property
                    this._isReadOnly = true;
                }

                if(this.sortAttr === "") {
                    this.sortAttr = this.RadioListItemAttribute;
                }

                // adjust the template based on the display settings.
                if( this.showLabel ) {
                    if (dojoClass.contains(this.radioButtonLabel, "hidden")) {
                        dojoClass.remove(this.radioButtonLabel, "hidden");
                    }

                    if(this.formOrientation === "horizontal"){
                        // width needs to be between 1 and 11
                        var labelWidth = this.labelWidth < 1 ? 1 : this.labelWidth;
                        labelWidth = this.labelWidth > 11 ? 11 : this.labelWidth;

                        var controlWidth = 12 - labelWidth,
                            comboLabelClass = "col-sm-" + labelWidth,
                            comboControlClass = "hasLabel col-sm-" + controlWidth;

                        dojoClass.add(this.radioButtonLabel, comboLabelClass);
                        dojoClass.add(this.inputNodes, comboControlClass);
                    }

                    this.radioButtonLabel.innerHTML = this.fieldCaption;
                } else {
                    if (!dojoClass.contains(this.radioButtonLabel, "hidden")) {
                        dojoClass.add(this.radioButtonLabel, "hidden");
                    }
                }

                this._reserveSpace();

            },

            /**
             * What to do when data is loaded?
             */

            update: function (obj, callback) {
                logger.debug(this.id + ".update");

                this._contextObj = obj;
                this._resetSubscriptions();
                this._setRadiobuttonOptions();

                callback();

            },

            _setRadiobuttonOptions: function () {
                logger.debug(this.id + "._setRadiobuttonOptions");

                if (this._contextObj) {
                    if (this.dataSourceType === "xpath") {
                        this._getDataFromXPath();
                    } else if (this.dataSourceType === "mf" && this.datasourceMf) {
                        this._getDataFromDatasource();
                    } else {
                        this._showError("Can\"t retrieve objects because no datasource microflow is specified");
                    }
                }
                else {
                    this._updateRendering();
                }

            },

            // Rerender the interface.
            _updateRendering: function () {
                logger.debug(this.id + "._updateRendering");
                if (this._contextObj !== null) {
                    dojoStyle.set(this.domNode, "display", "block");

                    this._createRadiobuttonNodes();

                }
                else {
                    if(!this._locatedInListview) {
                        dojoStyle.set(this.domNode, "display", "none");
                    }
                }

                // Important to clear all validations!
                this._clearValidations();
            },

            // Handle validations.
            _handleValidation: function (validations) {
                logger.debug(this.id + "._handleValidation");
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
                logger.debug(this.id + "._clearValidations");
                dojoConstruct.destroy(this._alertDiv);
                this._alertDiv = null;
            },

            // Show an error message.
            _showError: function (message) {
                logger.debug(this.id + "._showError");
                if (this._alertDiv !== null) {
                    dojoHtml.set(this._alertDiv, message);
                    return true;
                }
                this._alertDiv = dojoConstruct.create("div", {
                    "class": "alert alert-danger",
                    "innerHTML": message
                });
                dojoConstruct.place(this._alertDiv, this.inputNodes);
            },

            // Add a validation.
            _addValidation: function (message) {
                logger.debug(this.id + "._addValidation");
                this._showError(message);
            },

            // Reset subscriptions.
            _resetSubscriptions: function() {
                logger.debug(this.id + "._resetSubscriptions");
                // Release handles on previous object, if any.
                if (this._handles) {
                    dojoArray.forEach(this._handles, function (handle, i) {
                        mx.data.unsubscribe(handle);
                    });
                    this._handles = [];
                }

                // When a mendix object exists create subscribtions.
                if (this._contextObj) {
                    var objectHandle = this.subscribe({
                        guid: this._contextObj.getGuid(),
                        callback: dojoLang.hitch(this, function(guid) {
                            this._updateRendering();
                        })
                    });

                    var attrHandle = this.subscribe({
                        guid: this._contextObj.getGuid(),
                        attr: this.entity,
                        callback: dojoLang.hitch(this, function(guid, attr, attrValue) {
                            this._updateRendering();
                        })
                    });

                    var validationHandle = this.subscribe({
                        guid: this._contextObj.getGuid(),
                        val: true,
                        callback: dojoLang.hitch(this, this._handleValidation)
                    });

                    this._handles = [ objectHandle, attrHandle, validationHandle ];
                }
            },

            _getDataFromXPath: function () {
                logger.debug(this.id + "._getDataFromXPath");
                if (this._contextObj) {
                    mx.data.get({
                        xpath: "//" + this.RadioListObject + this.Constraint.replace(/\[%CurrentObject%\]/g, this._contextObj.getGuid()),
                        filter: {
                            limit: 50,
                            depth: 0,
                            sort: [[this.sortAttr, this.sortOrder]]
                        },
                        callback: dojoLang.hitch(this, this._populateRadiobuttonOptions)
                    });
                } else {
                    console.warn("Warning: No context object available.");
                }
            },

            _getDataFromDatasource: function () {
                logger.debug(this.id + "._getDataFromDatasource");
                this._execMF(this._contextObj, this.datasourceMf, dojoLang.hitch(this, this._populateRadiobuttonOptions));
            },

            _populateRadiobuttonOptions: function (objs) {
                logger.debug(this.id + "._populateRadiobuttonOptions");
                var mxObj = null,
                    i = 0;

                this._radioButtonOptions = {};
                for (i = 0; i < objs.length; i++) {

                    mxObj = objs[i];

                    this._radioButtonOptions[mxObj.getGuid()] = mxObj.get(this.RadioListItemAttribute);
                }
                this._updateRendering();
            },


            _createRadiobuttonNodes: function (mxObjArr) {
                logger.debug(this.id + "._createRadiobuttonNode");
                var mxObj = null,
                    i = 0,
                    j = 0,
                    labelNode = null,
                    radioButtonNode = null,
                    enclosingDivElement = null,
                    nodelength = 0;

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
                            if(this.inputNodes.children[i])    {
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
                logger.debug(this.id + "._createLabelNode");
                var labelNode = null,spanNode = null;

                labelNode = dojoConstruct.create("label");

                if (this._isReadOnly ||
                    this._contextObj.isReadonlyAttr(this.entity)) {
                    dojoAttr.set(labelNode, "disabled", "disabled");
                    dojoAttr.set(labelNode, "readonly", "readonly");
                }

                if ("" + this._contextObj.get(this.entity) === key) {
                    dojoClass.add(labelNode, "checked");
                }

                if (this.direction === "horizontal") {
                    dojoClass.add(labelNode, "radio-inline");
                }

                spanNode = dojoConstruct.place(dojoConstruct.create("span", {
                    "innerHTML": value
                }), labelNode);

                return labelNode;
            },

            _createRadiobuttonNode: function (key, value, index) {
                logger.debug(this.id + "._createRadiobuttonNode");
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
                this._addOnclickToRadiobuttonItem(radiobuttonNode,key);
                return radiobuttonNode;
            },

            _addOnclickToRadiobuttonItem: function (labelNode, rbvalue) {
                logger.debug(this.id + "._addOnclickToRadiobuttonItem");

                this.connect(labelNode, "onclick", dojoLang.hitch(this, function () {

                    if (this._isReadOnly ||
                        this._contextObj.isReadonlyAttr(this.entity)) {
                        return;
                    }

                    this._contextObj.set(this.entity, rbvalue);

                    if (this.onchangeAction) {
                        mx.data.action({
                            params: {
                                applyto: "selection",
                                actionname: this.onchangeAction,
                                guids: [this._contextObj.getGuid()]
                            },
                            store: {
                                caller: this.mxform
                            },
                            error: function (error) {
                                console.error("RadioButtonList.widget.AttrRadioButtonList._addOnclickToRadiobuttonItem: XAS error executing microflow; " + error.description);
                            }
                        });
                    }
                }));
            },

            _execMF: function (obj, mf, callback) {
                logger.debug(this.id + "._execMF");
                var params = {
                    applyto: "selection",
                    actionname: mf,
                    guids: []
                };
                if (obj) {
                    params.guids = [obj.getGuid()];
                }
                mx.data.action({
                    params: params,
                    store: {
                        caller: this.mxform
                    },
                    callback: function (objs) {
                        if (typeof callback !== "undefined") {
                            callback(objs);
                        }
                    },
                    error: function (error) {
                        if (typeof callback !== "undefined") {
                            callback();
                        }
                        console.error(error.description);
                    }
                }, this);
            },

            _reserveSpace : function () {
                logger.debug(this.id + "._reserveSpace");
                var i = 0;
                for (i; i<50; i++) {
                    dojoConstruct.place(dojoConstruct.create("div", {"class" : "radio", innerHTML: "&nbsp;"}),this.inputNodes);
                }
            }
        });
    });

require(["RadioButtonList/widget/AssocRadioButtonList"], function () {
    "use strict";
});
