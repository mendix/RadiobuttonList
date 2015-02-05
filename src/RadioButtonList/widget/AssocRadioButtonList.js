/*global mx, mxui, mendix, dojo, require, console, define, module */

(function () {
    'use strict';

    // test
    require([

        'mxui/widget/_WidgetBase', 'mxui/mixin/_ValidationHelper', 'dijit/_Widget', 'dijit/_TemplatedMixin',
        'mxui/dom', 'dojo/dom', 'dojo/query', 'dojo/dom-prop', 'dojo/dom-geometry', 'dojo/dom-attr', 'dojo/dom-class', 'dojo/dom-style', 'dojo/dom-construct', 'dojo/on', 'dojo/_base/lang', 'dojo/_base/declare', 'dojo/text',
        'dojo/_base/array'


    ], function (_WidgetBase, _ValidationHelper, _Widget, _Templated, domMx, dom, domQuery, domProp, domGeom, domAttr, domClass, domStyle, domConstruct, on, lang, declare, text, array) {

        // Provide widget.
        dojo.provide('RadioButtonList.widget.AssocRadioButtonList');

        // Declare widget.
        return declare('RadioButtonList.widget.AssocRadioButtonList', [_WidgetBase, _ValidationHelper, _Widget, _Templated], {

            /**
             * Internal variables.
             * ======================
             */
            _wgtNode: null,
            _contextGuid: null,
            _contextObj: null,
            _handles: null,

            // Extra variables
            _attrDisable: false,
            _selectedValue: null,
            _keyNodeArray: null,

            // Template path
            templatePath: dojo.moduleUrl('RadioButtonList', 'widget/templates/RadioButtonList.html'),

            /**
             * Mendix Widget methods.
             * ======================
             */

            // DOJO.WidgetBase -> PostCreate is fired after the properties of the widget are set.
            postCreate: function () {
                 console.log('AssocRadioButtonList - post create');
                // postCreate
                this._selectedValue = null;
                this.handles = null;

                this._keyNodeArray = {};
                this.assocName = this.entity.split("/")[0];

                this.entity = this.assocName; //to catch data validation

                if (this.readonly)
                    this._attrDisable = true;

                // Load CSS ... automaticly from ui directory

                // Setup widgets
                this._setupWidget();

                // Create childnodes
                this._createChildNodes();

                // Setup events
                this._setupEvents();

            },
            /**
             * What to do when data is loaded?
             */

            update: function (obj, callback) {
                // startup
                console.log('AssocRadioButtonList - update');

                this.removeError();

                if (this.handles) {
                    array.forEach(this.handles, function (handle, i) {
                        mx.data.unsubscribe(handle);
                    });
                }
                if (obj) {
                    this._mxObj = obj;

                    var validationhandle = mx.data.subscribe({
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

                    var refreshhandle = mx.data.subscribe({
                        guid: obj.getGuid(),
                        callback: lang.hitch(this, function (guid) {
                            this.update(obj, callback);
                        })
                    });

                    var refreshAttHandle = mx.data.subscribe({
                        guid: obj.getGuid(),
                        attr: this.entity,
                        callback: lang.hitch(this, function (guid) {
                            this.update(obj, callback);
                        })
                    });

                    this.handles = [validationhandle, refreshhandle, refreshAttHandle];

                    this._getListObjects(this._mxObj);
                }

                // Execute callback.
                if (typeof callback !== 'undefined') {
                    callback();
                }
            },

            //summary : stub function, will be used or replaced by the client environment
            onChange: function () {
                 console.log('AssocRadioButtonList - on change');
                this.removeError();
            },

            uninitialize: function () {

                if (this.handles) {
                    array.forEach(this.handles, function (handle, i) {
                        mx.data.unsubscribe(handle);
                    });
                }
            },

            /**
             * Extra setup widget methods.
             * ======================
             */
            _setupWidget: function () {

                // To be able to just alter one variable in the future we set an internal variable with the domNode that this widget uses.
                this._wgtNode = this.domNode;

            },

            // Create child nodes.
            _createChildNodes: function () {

            },

            // Attach events to newly created nodes.
            _setupEvents: function () {


            },


            /**
             * Interaction widget methods.
             * ======================
             */
            _getListObjects: function (context) {
                console.log('AssocRadioButtonList - get List objects');
                if (this.dataSourceType === "xpath") {
                    var xpathString = '';
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
                    var errordiv = mxui.dom.div("Can't retrieve objects because no datasource microflow is specified");
                    domAttr.set(errordiv, "class", "alert alert-danger");
                    this.domNode.appendChild(errordiv);
                }

            },

            _initRadioButtonList: function (mxObjArr) {
                console.log('AssocRadioButtonList - init RB list');
                domConstruct.empty(this.domNode);
                var $ = domConstruct.create;
                var mxObj;

                var currentSelectedValue;

                if (this._mxObj.getReferences(this.assocName).length == 1) {
                    this._selectedValue = currentSelectedValue = this._mxObj.getReferences(this.assocName)[0];
                }

                for (var i = 0; i < mxObjArr.length; i++) {
                    mxObj = mxObjArr[i];

                    var radioid = this.RadioListObject + '_' + this.id + '_' + i;

                    var labelNode = $("label");

                    domAttr.set(labelNode, 'disabled', this._attrDisable);

                    var guid = mxObj.getGuid();
                    var rbNode = $("input", {
                        'type': 'radio',
                        'value': guid,
                        'id': radioid
                    });

                    domAttr.set(rbNode, 'name', "radio" + this._mxObj.getGuid() + '_' + this.id);

                    this._keyNodeArray[guid] = rbNode;
                    domAttr.set(rbNode, 'disabled', this._attrDisable);

                    if (currentSelectedValue === mxObj.getGuid()) {
                        domAttr.set(rbNode, 'defaultChecked', true);
                    }

                    var textDiv = $("span", {
                        'innerHTML': mxObj.get(this.RadioListItemAttribute)
                    });

                    labelNode.appendChild(rbNode);
                    labelNode.appendChild(textDiv);

                    this.connect(rbNode, "onclick", lang.hitch(this, this._onclickRadio, mxObj.getGuid(), rbNode));

                    if (this.direction === "horizontal") {
                        domClass.add(labelNode, "radio-inline");
                        this.domNode.appendChild(labelNode);
                    } else {
                        var radiodiv = $("div", {
                            "class": "radio"
                        });
                        radiodiv.appendChild(labelNode);
                        this.domNode.appendChild(radiodiv);
                    }
                }
            },

            _onclickRadio: function (radioKey, rbNode) {
                console.log('AssocRadioButtonList - on click');

                if (this._attrDisable)
                    return;

                this._setValue(radioKey);
                domAttr.set(rbNode, 'checked', true);

                this.onChange();
                this._triggerMicroflow();
            },

            _setValue: function (value) {
                console.log('AssocRadioButtonList - set value');
                if (this._selectedValue !== null) {
                    if (this._selectedValue !== '' && this._keyNodeArray[this._selectedValue]) {
                        this._keyNodeArray[this._selectedValue].checked = false;
                        this._keyNodeArray[this._selectedValue].defaultChecked = false;
                    }
                }
                this._selectedValue = value;

                if (this._mxObj !== null) {
                    this._mxObj.set(this.assocName, value);
                }
                if (value !== '' && this._keyNodeArray[value]) {
                    this._keyNodeArray[this._selectedValue].checked = true;
                    this._keyNodeArray[this._selectedValue].defaultChecked = true;
                }
            },

            _triggerMicroflow: function () {
                console.log('AssocRadioButtonList - trigger mf');
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
                console.log('AssocRadioButtonList - set Disabled');
                if (!this.readonly)
                    this._attrDisable = !!value;
            },

            _execMF: function (obj, mf, callback) {
                console.log('AssocRadioButtonList - execmf');
                var params = {
                    applyto: "selection",
                    actionname: mf,
                    guids: []
                };
                if (obj)
                    params.guids = [obj.getGuid()];

                mx.data.action({
                    params: params,
                    callback: function (objs) {
                        if (typeof callback !== 'undefined') {
                            callback(objs);
                        }
                    },
                    error: function (error) {
                        if (typeof callback !== 'undefined') {
                            callback();
                        }
                        console.log(error.description);
                    }
                }, this);
            }


        });
    });

}());