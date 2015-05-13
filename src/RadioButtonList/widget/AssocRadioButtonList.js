/*jslint white:true, nomen: true, plusplus: true */
/*global mx, define, require, browser, devel, console, document, jQuery, mxui, dojo */
/*mendix */
/*
    AssocRadioButtonList
    ========================

    @file      : AssocRadioButtonList.js
    @version   : 1.0
    @author    : Gerhard Richard Edens
    @date      : Wed, 24 Apr 2015 09:28:00 GMT
    @copyright : Mendix b.v.
    @license   : Apache 2

    Documentation
    ========================
    ...
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare", "mxui/widget/_WidgetBase", "dijit/_TemplatedMixin",
    "mxui/dom", "dojo/dom", "dojo/query", "dojo/dom-prop", "dojo/dom-geometry", "dojo/dom-attr", "dojo/dom-class", "dojo/dom-style", "dojo/dom-construct", "dojo/on", "dojo/_base/lang", "dojo/text",
    "dojo/_base/array", "dojo/text!RadioButtonList/widget/templates/RadioButtonList.html"
], function (declare, _WidgetBase, _TemplatedMixin, 
              domMx, dom, domQuery, domProp, domGeom, domAttr, domClass, domStyle, domConstruct, on, lang, text, dojoArray, widgetTemplate) {
    "use strict";

    // Declare widget.
    return declare("RadioButtonList.widget.AssocRadioButtonList", [_WidgetBase, _TemplatedMixin], {

        // Template path
        templateString: widgetTemplate, //dojo.moduleUrl('RadioButtonList', 'widget/templates/RadioButtonList.html'),
        
        /**
         * Internal variables.
         * ======================
         */
        _contextGuid: null,
        _contextObj: null,
        _handles: null,

        // Extra variables
        _attrDisable: false,
        _selectedValue: null,
        _keyNodeArray: null,

        /**
         * Mendix Widget methods.
         * ======================
         */
        constructor: function () {
            this._selectedValue = null;
            this._handles = null;

            this._keyNodeArray = null;
            this.assocName = null;
        },

        // DOJO.WidgetBase -> PostCreate is fired after the properties of the widget are set.
        postCreate: function () {
            
            this._keyNodeArray = {};
            this.assocName = (typeof this.entity !== 'undefined' && this.entity !== '') ? this.entity.split("/")[0] : '';
            this.entity = this.assocName; //to catch data validation

            if (this.readonly) {
                this._attrDisable = true;
            }
            
            console.log("AssocRadioButtonList - post create");
        },

        /**
         * What to do when data is loaded?
         */

        update: function (obj, callback) {
            var validationhandle = null, refreshhandle = null, refreshAttHandle = null;
            
            // startup
            console.log("AssocRadioButtonList - update");

            if (this._handles) {
                dojoArray.forEach(this._handles, lang.hitch(this, function (handle, i) {
                    this.unsubscribe(handle);
                }));
            }
            
            if (obj) {
                this._mxObj = obj;

                validationhandle = this.subscribe({
                    guid: obj.getGuid(),
                    val: true,
                    callback: lang.hitch(this, function (validations) {
                        var val = validations[0],
                            msg = val.getReasonByAttribute(this.entity);
                        if (this.readonly) {
                            val.removeAttribute(this.entity);
                        } else {
                            if (msg) {
                                this.addError(msg);
                                val.removeAttribute(this.entity);
                            }
                        }
                    })
                });

                refreshhandle = this.subscribe({
                    guid: obj.getGuid(),
                    callback: lang.hitch(this, function (guid) {
                        mx.data.get({
                            guids    : [guid],
                            callback : lang.hitch(this, function(objs) {
                                this._mxObj = objs[0];
                                this._getListObjects(this._mxObj);
                            })
                        });
                    })
                });

                refreshAttHandle = this.subscribe({
                    guid: obj.getGuid(),
                    attr: this.entity,
                    callback: lang.hitch(this, function (guid) {
                        mx.data.get({
                            guids    : [guid],
                            callback : lang.hitch(this, function(objs) {
                                this._mxObj = objs[0];
                                this._getListObjects(this._mxObj);
                            })
                        });
                    })
                });

                this._handles = [validationhandle, refreshhandle, refreshAttHandle];

                this._getListObjects(this._mxObj);
            }

            // Execute callback.
            callback();

        },
        
        uninitialize: function () {

            if (this.handles) {
                dojoArray.forEach(this.handles, lang.hitch(this, function (handle, i) {
                    this.unsubscribe(handle);
                }));
            }
        },

        /**
         * Interaction widget methods.
         * ======================
         */
        _getListObjects: function (context) {
            var xpathString = null, errordiv = null;
            console.log("AssocRadioButtonList - get List objects");
            if (this.dataSourceType === "xpath") {
                xpathString = "";
                if (context) {
                    xpathString = "//" + this.RadioListObject + this.Constraint.replace(/\[%CurrentObject%\]/g, context.getGuid());
                    mx.data.get({
                        xpath: xpathString,
                        filter: {
                            limit: 50,
                            depth: 0,
                            sort: [[this.sortAttr, this.sortOrder]]
                        },
                        callback: lang.hitch(this, this._initRadioButtonList)
                    });
                } else {
                    console.warn("Warning: No context object available.");
                }
            } else if (this.dataSourceType === "mf" && this.datasourceMf) {
                this._execMF(this._mxObj, this.datasourceMf, lang.hitch(this, this._initRadioButtonList));
            } else {
                domConstruct.empty(this.domNode);
                errordiv = mxui.dom.div("Can\"t retrieve objects because no datasource microflow is specified");
                domAttr.set(errordiv, "class", "alert alert-danger");
                domConstruct.place(errordiv, this.domNode, "last");
            }

        },

        _initRadioButtonList: function (mxObjArr) {
            var $ = domConstruct.create, mxObj = null, i = null, radioid = null, labelNode = null,
                guid = null, rbNode = null, textDiv = null, currentSelectedValue = null, radiodiv = null;

            console.log("AssocRadioButtonList - init RB list");

            // Empty domNode
            domConstruct.empty(this.domNode);
            
            if (this._mxObj.getReferences(this.assocName).length === 1) {
                this._selectedValue = currentSelectedValue = this._mxObj.getReferences(this.assocName)[0];
            }

            for (i = 0; i < mxObjArr.length; i++) {
                mxObj = mxObjArr[i];

                radioid = this.RadioListObject + "_" + this.id + "_" + i;

                labelNode = $("label");

                domAttr.set(labelNode, "disabled", this._attrDisable);

                guid = mxObj.getGuid();
                
                rbNode = $("input", {
                    "type": "radio",
                    "value": guid,
                    "id": radioid
                });

                domAttr.set(rbNode, "name", "radio" + this._mxObj.getGuid() + "_" + this.id);

                this._keyNodeArray[guid] = rbNode;
                
                domAttr.set(rbNode, "disabled", this._attrDisable);

                if (currentSelectedValue === mxObj.getGuid()) {
                    domAttr.set(rbNode, "defaultChecked", true);
                    domClass.add(labelNode, "checked");
                }

                textDiv = $("span", {
                    "innerHTML": mxObj.get(this.RadioListItemAttribute)
                });

                domConstruct.place(rbNode, labelNode, "last");
                domConstruct.place(textDiv, labelNode, "last");

                this.connect(labelNode, "click", lang.hitch(this, this._onclickRadio, mxObj.getGuid(), rbNode));

                if (this.direction === "horizontal") {
                    domClass.add(labelNode, "radio-inline");
                    domConstruct.place(labelNode, this.domNode, "last");
                } else {
                    radiodiv = $("div", {
                        "class": "radio"
                    });
                    domConstruct.place(labelNode, radiodiv, "last");
                    domConstruct.place(radiodiv, this.domNode, "last");
                }
            }
        },

        _onclickRadio: function (radioKey, rbNode) {
            console.log("AssocRadioButtonList - on click");

            if (this._attrDisable) {
                return;
            }

            this._setValue(radioKey);
            domAttr.set(rbNode, "checked", true);
            this._triggerMicroflow();
        },

        _setValue: function (value) {
            console.log("AssocRadioButtonList - set value");
            if (this._selectedValue !== null) {
                if (this._selectedValue !== "" && this._keyNodeArray[this._selectedValue]) {
                    this._keyNodeArray[this._selectedValue].checked = false;
                    this._keyNodeArray[this._selectedValue].defaultChecked = false;
                    domClass.remove(this._keyNodeArray[this._selectedValue], "checked");
                }
            }
            this._selectedValue = value;

            if (this._mxObj !== null) {
                this._mxObj.set(this.assocName, value);
            }
            if (value !== "" && this._keyNodeArray[value]) {
                this._keyNodeArray[this._selectedValue].checked = true;
                this._keyNodeArray[this._selectedValue].defaultChecked = true;
                domClass.add(this._keyNodeArray[this._selectedValue], "checked");
            }
        },

        _triggerMicroflow: function () {
            console.log("AssocRadioButtonList - trigger mf");
            if (this.onchangeAction) {
                mx.data.action({
                    params: {
                        applyto: "selection",
                        actionname: this.onchangeAction,
                        guids: [this._mxObj.getGuid()]
                    },
                    error: function (error) {
                        console.log("RadioButtonList.widget.AssocRadioButtonList._triggerMicroflow: XAS error executing microflow; " + error.description);
                    }
                });
            }
        },

        _setDisabledAttr: function (value) {
            console.log("AssocRadioButtonList - set Disabled");
            if (!this.readonly) {
                this._attrDisable = !!value;
            }
        },

        _execMF: function (obj, mf, callback) {
            console.log("AssocRadioButtonList - execmf");
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
                callback: function (objs) {
                    if (typeof callback !== "undefined") {
                        callback(objs);
                    }
                },
                error: function (error) {
                    if (typeof callback !== "undefined") {
                        callback();
                    }
                    console.log(error.description);
                }
            }, this);
        }


    });
});
require(["RadioButtonList/widget/AssocRadioButtonList"], function () {
    "use strict";
});