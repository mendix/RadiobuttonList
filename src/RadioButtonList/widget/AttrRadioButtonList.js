/*global mx, mxui, mendix, dojo, require, console, define, module */

(function() {
    'use strict';

    // test
    require([

        'mxui/widget/_WidgetBase', 'mxui/mixin/_ValidationHelper', 'dijit/_Widget', 'dijit/_TemplatedMixin',
        'mxui/dom', 'dojo/dom', 'dojo/query', 'dojo/dom-prop', 'dojo/dom-geometry', 'dojo/dom-attr', 'dojo/dom-class', 'dojo/dom-style',  'dojo/dom-construct',  'dojo/on', 'dojo/_base/lang', 'dojo/_base/declare', 'dojo/text',
        'dojo/_base/array'

    ], function (_WidgetBase, _ValidationHelper, _Widget, _Templated, domMx, dom, domQuery, domProp, domGeom, domAttr, domClass, domStyle, domConstruct, on, lang, declare, text, array) {

        // Provide widget.
        dojo.provide('RadioButtonList.widget.AttrRadioButtonList');

        // Declare widget.
        return declare('RadioButtonList.widget.AttrRadioButtonList', [ _WidgetBase, _ValidationHelper, _Widget, _Templated], {
			
            /**
             * Internal variables.
             * ======================
             */
            _wgtNode: null,
            _attrDisable : false, 

            // Template path
            templatePath: dojo.moduleUrl('RadioButtonList', 'widget/templates/RadioButtonList.html'),

            /**
             * Mendix Widget methods.
             * ======================
             */

            // DOJO.WidgetBase -> PostCreate is fired after the properties of the widget are set.
            postCreate: function () {

                // Load CSS ... automaticly from ui directory

                // Setup widgets
                this._setupWidget();

                // Setup events
                this._setupEvents();

            },

            // DOJO.WidgetBase -> Startup is fired after the properties of the widget are set.
            startup: function () {

            },

            /**
             * What to do when data is loaded?
             */

            update: function (obj, callback) {

                this.removeError();

                if(this.handles){
                    array.forEach(this.handles, function (handle, i) {
                        mx.data.unsubscribe(handle);
                    });
                }
                //load embedded
                var loaded = false;
                var errorhandled = false;

                if (obj) {

                    this.mendixobject = obj;
                    try {
                        if (this.entity !== '') {
                            var enumerationObj;
                            //get enumeration for current attribute
                            if(obj.getAttributeType(this.entity) == 'Enum')
                                enumerationObj = obj.getEnumKVPairs(this.entity);
                            else if(obj.getAttributeType(this.entity) == 'Boolean')
                            {
                                enumerationObj = {};
                                enumerationObj['true'] = this.captiontrue;
                                enumerationObj['false'] = this.captionfalse;
                            }
                            this._initRadioButtonList(enumerationObj);
                            loaded = true;
                        }
                    }
                    catch (err) {
                        console.error(this.id +'.update: error while loading attr ' + err);
                        loaded = false;
                    }

                    var validationhandle = mx.data.subscribe({
                        guid     : obj.getGuid(),
                        val      : true,
                        callback : lang.hitch(this,function(validations) {
                            var val = validations[0],
                                msg = val.getReasonByAttribute(this.entity);    

                            if(this.readonly){
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
                        guid     : obj.getGuid(),
                        callback : lang.hitch(this, function(guid) {
                            this.update(obj, callback);
                        })
                    });

                    var refreshAttHandle = mx.data.subscribe({
                        guid    : obj.getGuid(),
                        attr    : this.entity,
                        callback : lang.hitch(this, function(guid) {
                            this.update(obj, callback);
                        })
                    });

                    this.handles = [validationhandle, refreshhandle, refreshAttHandle];

                } else {
                    console.log(this.id + '.update: received null object');
                }

                // Execute callback.
                if(typeof callback !== 'undefined'){
                    callback();
                }
            },
            
            //summary : stub function, will be used or replaced by the client environment
            onChange : function(){
                this.removeError();
            },
            
            uninitialize : function(){
                
                if(this.handles){
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

                this.mendixobject = null;
                this.keyNodeArray = null;
                this.handles = null;

                this.keyNodeArray = {};
                if (this.readonly)
                    this._attrDisable = true;

                // To be able to just alter one variable in the future we set an internal variable with the domNode that this widget uses.
                this._wgtNode = this.domNode;

            },


            // Attach events to newly created nodes.
            _setupEvents: function () {

                console.log('WidgetName - setup events');
                
            },


            /**
             * Interaction widget methods.
             * ======================
             */
            _initRadioButtonList : function(enumObj){
                var $ = domConstruct.create,
                    i = 0,
                    attrName = null;
                
                domConstruct.empty(this.domNode);
                
                attrName = "" + this.mendixobject.get(this.entity);
                
                for (var key in enumObj) {
                    var radioid = this.entity+'_'+this.id+'_'+i;

                    var labelNode = $("label");
                    domAttr.set(labelNode, 'disabled', this._attrDisable);

                    var rbNode = $("input", {
                        'type' : 'radio',
                        'value' : key,
                        'id' : radioid
                    });

                    domAttr.set(rbNode, 'name',  "radio"+this.mendixobject.getGuid()+'_'+this.id);			

                    this.keyNodeArray[key] = rbNode;			
                    domAttr.set(rbNode, 'disabled', this._attrDisable);	

                    if (attrName == key) {
                        domAttr.set(rbNode,'defaultChecked', true);
                        this.selectedValue = key;
                    }

                    var textDiv = mxui.dom.span(enumObj[key]);
                    this.connect(rbNode, "onclick", lang.hitch(this, this._onChangeRadio, rbNode, key));			

                    labelNode.appendChild(rbNode);
                    labelNode.appendChild(textDiv);

                    if(this.direction === "horizontal"){
                        dojo.addClass(labelNode, "radio-inline");
                        this.domNode.appendChild(labelNode);
                    } else {
                        var radiodiv = $("div", {"class" : "radio"});
                        radiodiv.appendChild(labelNode);
                        this.domNode.appendChild(radiodiv);
                    }

                    i++;
                }
            },

            _onChangeRadio : function(rbNode, enumkey) {

                if (this._attrDisable)
                    return;

                domAttr.set(rbNode,'checked', true);
                this.selectedValue = enumkey;
                this._setValue(enumkey);
                this.onChange();
                this._triggerMicroflow();
            },

            //invokes the microflow coupled to the tag editor
            _triggerMicroflow : function() {
                
                if (this.onchangeAction) {
                    mx.data.action({
                        params          : {
                            applyto     : "selection",
                            actionname  : this.onchangeAction,
                            guids       : [this.mendixobject.getGuid()]
                        },
                        error           : function(error) {
                            console.log("RadioButtonList.widget.AssocRadioButtonList._triggerMicroflow: XAS error executing microflow; " + error.description);
                        }
                    });			
                }
            },

            _setDisabledAttr : function (value) {
                if (!this.readonly)
                    this._attrDisable = !!value;
            },

            _setValue : function (oldvalue) {
                var value = oldvalue;

                if ( this.selectedValue !== null) {
                    if ( this.selectedValue !== '' && this.keyNodeArray[this.selectedValue] ) {
                        this.keyNodeArray[this.selectedValue].checked = false;
                        this.keyNodeArray[this.selectedValue].defaultChecked = false;
                    }
                }
                if (this.mendixobject !== null) {

                    if(this.mendixobject.isBoolean(this.entity)) {
                        var boolvalue = oldvalue == 'true' ? true : false;
                        this.mendixobject.set(this.entity, boolvalue);
                        this.selectedValue = boolvalue;
                    } else {
                        this.mendixobject.set(this.entity, value);
                        this.selectedValue = value;
                    }
                }

                if (value !== '' && this.keyNodeArray[value]) {
                    this.keyNodeArray[this.selectedValue].checked = true;
                    this.keyNodeArray[this.selectedValue].defaultChecked = true;
                }	
            }

        });
    });

}());
