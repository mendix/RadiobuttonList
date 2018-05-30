/*jslint browser: true, devel:true, nomen:true, unparam:true, regexp: true, plusplus:true*/
/*global require, define, logger, mx, mendix*/
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
    function (declare, _WidgetBase, _TemplatedMixin, dom, dojoClass, dojoStyle, dojoConstruct, dojoAttr, dojoArray, lang, dojoHtml, widgetTemplate) {
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
            allowDeselect: false,
            formOrientation: null,

            // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
            _handles: null,
            _contextObj: null,
            _alertDiv: null,
            _radioButtonOptions: null,
            _isReadOnly: false,
            _assocName: null,
            _locatedInListview: false,
            _setup: false,

            constructor: function () {
                this._handles = [];
            },

            postCreate: function () {
                logger.debug(this.id + ".postCreate");
            },

            update: function (obj, callback) {
                logger.debug(this.id + ".update");

                this._contextObj = obj;
                this._resetSubscriptions();

                if (!this._setup) {
                    this._setupWidget(lang.hitch(this, function () {
                        this._setRadiobuttonOptions(callback);
                    }));
                } else {
                    this._setRadiobuttonOptions(callback);
                }
            },

            _setupWidget: function (callback) {
                logger.debug(this.id + "._setupWidget");
                this._assocName = (typeof this.entity !== "undefined" && this.entity !== "") ? this.entity.split("/")[0] : "";
                this.entity = this._assocName; //to catch data validation

                if (this.readOnly || this.get("disabled") || this.readonly) {
                    //this.readOnly isn't available in client API, this.get("disabled") works correctly since 5.18.
                    //this.readonly is a widget property
                    this._isReadOnly = true;
                }

                if (this.sortAttr === "") {
                    this.sortAttr = this.RadioListItemAttribute;
                }

                // adjust the template based on the display settings.
                if (this.showLabel) {
                    if (dojoClass.contains(this.radioButtonLabel, "hidden")) {
                        dojoClass.remove(this.radioButtonLabel, "hidden");
                    }

                    if (this.formOrientation === "horizontal") {
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

                this._setup = true;

                this._executeCallback(callback, "_setupWidget");
            },

            _setRadiobuttonOptions: function (callback) {
                logger.debug(this.id + "._setRadiobuttonOptions");

                if (this._contextObj) {
                    if (this.dataSourceType === "xpath") {
                        this._getDataFromXPath(callback);
                    } else if (this.dataSourceType === "mf" && this.datasourceMf) {
                        this._getDataFromDatasource(callback);
                    } else {
                        this._showError("Can\"t retrieve objects because no datasource microflow is specified");
                        this._executeCallback(callback, "_setRadiobuttonOptions");
                    }
                } else {
                    this._updateRendering(callback);
                }
            },

            _updateRendering: function (callback) {
                logger.debug(this.id + "._updateRendering");
                if (this._contextObj !== null) {
                    dojoStyle.set(this.domNode, "display", "block");
                    this._createRadiobuttonNodes(callback);
                } else {
                    if (!this._locatedInListview) {
                        dojoStyle.set(this.domNode, "display", "none");
                    }
                    this._executeCallback(callback, "_updateRendering no context");
                }

                // Important to clear all validations!
                this._clearValidations();
            },

            _handleValidation: function (validations) {
                logger.debug(this.id + "._handleValidation");
                this._clearValidations();

                var validation = validations[0],
                    message = validation.getReasonByAttribute(this.entity);

                if (this._isReadOnly || this._contextObj.isReadonlyAttr(this.entity)) {
                    validation.removeAttribute(this.entity);
                } else if (message) {
                    this._addValidation(message);
                    validation.removeAttribute(this.entity);
                }
            },

            _clearValidations: function () {
                logger.debug(this.id + "._clearValidations");
                dojoConstruct.destroy(this._alertDiv);
                this._alertDiv = null;
            },

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

            _addValidation: function (message) {
                logger.debug(this.id + "._addValidation");
                this._showError(message);
            },

            _resetSubscriptions: function () {
                logger.debug(this.id + "._resetSubscriptions");
                // Release handles on previous object, if any.
                this.unsubscribeAll();

                // When a mendix object exists create subscribtions.
                if (this._contextObj) {
                    this.subscribe({
                        guid: this._contextObj.getGuid(),
                        callback: lang.hitch(this, function (guid) {
                            this._updateRendering();
                        })
                    });

                    this.subscribe({
                        guid: this._contextObj.getGuid(),
                        attr: this.entity,
                        callback: lang.hitch(this, function (guid, attr, attrValue) {
                            this._updateRendering();
                        })
                    });

                    this.subscribe({
                        guid: this._contextObj.getGuid(),
                        val: true,
                        callback: lang.hitch(this, this._handleValidation)
                    });
                }
            },

            _getDataFromXPath: function (callback) {
                logger.debug(this.id + "._getDataFromXPath");
                if (this._contextObj) {
                    mx.data.get({
                        xpath: "//" + this.RadioListObject + this.Constraint.replace(/\[%CurrentObject%\]/g, this._contextObj.getGuid()),
                        filter: {
                            limit: 50,
                            depth: 0,
                            sort: [
                                [this.sortAttr, this.sortOrder]
                            ]
                        },
                        callback: lang.hitch(this, function (objs) {
                            this._populateRadiobuttonOptions(objs, callback);
                        }),
                        error: lang.hitch(this, function (err) {
                            console.error(err);
                            this._executeCallback(callback, "_getDataFromXPath mx.data.get.error");
                        })
                    });
                } else {
                    console.warn("Warning: No context object available.");
                }
            },

            _getDataFromDatasource: function (callback) {
                logger.debug(this.id + "._getDataFromDatasource");
                this._execMF(this._contextObj, this.datasourceMf, lang.hitch(this, function (objs) {
                    this._populateRadiobuttonOptions(objs, callback);
                }));
            },

            _populateRadiobuttonOptions: function (objs, callback) {
                logger.debug(this.id + "._populateRadiobuttonOptions");
                var mxObj = null,
                    i = 0;

                this._radioButtonOptions = {};
                for (i = 0; i < objs.length; i++) {
                    mxObj = objs[i];
                    this._radioButtonOptions[mxObj.getGuid()] = mxObj.get(this.RadioListItemAttribute);
                }
                this._updateRendering(callback);
            },

            _createRadiobuttonNodes: function (callback) {
                logger.debug(this.id + "._createRadiobuttonNode");

                var mxObj = null,
                    i = 0,
                    j = 0,
                    labelNode = null,
                    radioButtonNode = null,
                    enclosingDivElement = null,
                    nodelength = this.inputNodes.children ? this.inputNodes.children.length : 0;

                if (this.direction === "horizontal") {
                    dojoConstruct.empty(this.inputNodes);
                }

                for (var option in this._radioButtonOptions) {
                    if (this._radioButtonOptions.hasOwnProperty(option)) {

                        labelNode = this._createLabelNode(option, this._radioButtonOptions[option]);
                        radioButtonNode = this._createRadiobuttonNode(option, this._radioButtonOptions[option]);

                        dojoConstruct.place(radioButtonNode, labelNode, "first");

                        if (this.direction === "horizontal") {
                            dojoConstruct.place(labelNode, this.inputNodes, "last");
                        } else {
                            //an enclosing div element is required to vertically align a radiobuttonlist in bootstrap.
                            if (this.inputNodes.children && this.inputNodes.children[i]) {
                                enclosingDivElement = this.inputNodes.children[i];
                            } else {
                                enclosingDivElement = dojoConstruct.create("div", {
                                    "class": "radio"
                                });
                            }
                            if (enclosingDivElement.children[0]) {
                                dojoConstruct.destroy(enclosingDivElement.children[0]);
                            }

                            dojoConstruct.place(labelNode, enclosingDivElement, "only");
                            if (!this.inputNodes.children[i]) {
                                dojoConstruct.place(enclosingDivElement, this.inputNodes, "last");
                            }
                        }

                        i++;
                    }
                }
                j = i;
                if (j > 0) {
                    for (j; j <= nodelength; j++) {
                        dojoConstruct.destroy(this.inputNodes.children[i]);
                    }
                }

                this._executeCallback(callback, "_createRadiobuttonNodes");
            },

            _createLabelNode: function (key, value) {
                logger.debug(this.id + "._createLabelNode");
                var labelNode = null,
                    spanNode = null;

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
                this._addOnclickToRadiobuttonItem(radiobuttonNode, key);
                return radiobuttonNode;
            },

            _addOnclickToRadiobuttonItem: function (labelNode, rbvalue) {
                logger.debug(this.id + "._addOnclickToRadiobuttonItem");

                this.connect(labelNode, "onclick", lang.hitch(this, function () {

                    if (this._isReadOnly ||
                        this._contextObj.isReadonlyAttr(this.entity)) {
                        return;
                    }
                    if (this.allowDeselect && this._contextObj.get(this.entity) === rbvalue) {
                        this._contextObj.set(this.entity, "");
                        dojoAttr.set(labelNode, "checked", false);
                    } else {
                        this._contextObj.set(this.entity, rbvalue);
                    }

                    this._clearValidations();

                    if (this.onchangeAction) {
                        var action = {
                            params: {
                                applyto: "selection",
                                actionname: this.onchangeAction,
                                guids: [this._contextObj.getGuid()]
                            },
                            error: function (error) {
                                console.error("RadioButtonList.widget.AttrRadioButtonList._addOnclickToRadiobuttonItem: XAS error executing microflow; " + error.description);
                            }
                        };

                        if (!mx.version || !!mx.version && 7 > parseInt(mx.version.split(".")[ 0 ], 10)) {
                            action.store = {
                                caller: this.mxform,
                            };
                        } else {
                            action.origin = this.mxform;
                        }

                        mx.data.action(action, this);
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
                var action = {
                    params: params,
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
                };

                if (!mx.version || !!mx.version && 7 > parseInt(mx.version.split(".")[ 0 ], 10)) {
                    action.store = {
                        caller: this.mxform,
                    };
                } else {
                    action.origin = this.mxform;
                }

                mx.data.action(action, this);
            },

            _executeCallback: function (cb, from) {
                logger.debug(this.id + "._executeCallback " + (typeof cb) + (from ? " from " + from : ""));
                if (cb && typeof cb === "function") {
                    cb();
                }
            }
        });
    });

require(["RadioButtonList/widget/AssocRadioButtonList"]);
