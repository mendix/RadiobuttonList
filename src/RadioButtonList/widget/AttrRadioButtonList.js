/**
	Radiobutton List Widget
	========================

	@file      : RadioButtonList.js
	@version   : 3.0
	@author    : Roeland Salij, Andries Smit
	@date      : 22-08-2014
	@copyright : Mendix
	@license   : Please contact our sales department.

	Documentation
	=============
	This widget can be used to show a radio button list instead of a dropdown list based on an enumeration attribute of an object.
	
	Open Issues
	===========

*/
dojo.provide("RadioButtonList.widget.AttrRadioButtonList");

mxui.dom.addCss(require.toUrl("RadioButtonList/widget/ui/RadioButtonList.css"));

mxui.widget.declare('RadioButtonList.widget.AttrRadioButtonList', {
	//DECLARATION
	mixins       : [dijit._TemplatedMixin, mendix.addon._Contextable, mxui.mixin._ValidationHelper],
	templateString : '<div class="RadioButtonList"></div>',
	inputargs: {
		name : '',
		direction : 'horizontal',
		captiontrue: 'true',
		captionfalse: 'false',
		onchangeAction: '',
		readonly : false
	},
	
	//IMPLEMENTATION
	mendixobject : null,
	attrDisable :false,
	selectedValue : '',
	keyNodeArray : null,
	handles : null,
	
	
	initRadioButtonList : function(enumObj){
                var $ = mxui.dom.create;
		var i = 0;
		dojo.empty(this.domNode);
		var attrName = "" + this.mendixobject.get(this.name);
		for (var key in enumObj) {
			var radioid = this.name+'_'+this.id+'_'+i;
			
			var rbNode = $("input", {
				'type' : 'radio',
				'value' : key,
				'id' : radioid
			});
                        
			//MWE: name is set here, because otherwise it will result in a
			//"INVALID_CHARACTER_ERR (5)" exception,
			//which is a result of the fact that document.createElement("<tagname baldibla='basdf'>") is not allowed anymore
			dojo.attr(rbNode, 'name',  "radio"+this.mendixobject.getGuid()+'_'+this.id);			
			
			this.keyNodeArray[key] = rbNode;			
			dojo.attr(rbNode, 'disabled', this.attrDisable);	

			if (attrName == key) {
				dojo.attr(rbNode,'defaultChecked', true);
				this.selectedValue = key;
			}

			var textDiv = mxui.dom.span(enumObj[key]);
			this.connect(rbNode, "onclick", dojo.hitch(this, this.onChangeRadio, rbNode, key));			
                        
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
 
	onChangeRadio : function(rbNode, enumkey) {
		logger.debug(this.id + ".onChangeRadio");
		if (this.attrDisable)
			return;

		dojo.attr(rbNode,'checked', true);
		this.selectedValue = enumkey;
		this._setValueAttr(enumkey);
		this.onChange();
		this.triggerMicroflow();
	},
 
	//invokes the microflow coupled to the tag editor
	triggerMicroflow : function() {
		logger.debug(this.id + ".triggerMicroflow");
		
		if (this.onchangeAction) {
                    mx.data.action({
                        params          : {
                            applyto     : "selection",
                            actionname  : this.onchangeAction,
                            guids       : [this.mendixobject.getGuid()]
                        },
                        error           : function(error) {
                            logger.error("RadioButtonList.widget.AssocRadioButtonList.triggerMicroFlow: XAS error executing microflow; " + error.description);
                        }
                    });			
		}
	},
	
 	_setDisabledAttr : function (value) {
		if (!this.readonly)
			this.attrDisable = !!value;
	},
	
	_getValueAttr : function () {
		return this.selectedValue;
	},
	
	_setValueAttr : function (oldvalue) {
		var value = oldvalue;

		if ( this.selectedValue !== null) {
			if (  this.selectedValue != '' && this.keyNodeArray[this.selectedValue] ) {
				this.keyNodeArray[this.selectedValue].checked = false;
				this.keyNodeArray[this.selectedValue].defaultChecked = false;
			}
		}
		if (this.mendixobject !== null) {

			if(this.mendixobject.isBoolean(this.name)) {
				var boolvalue = oldvalue == 'true' ? true : false;
				this.mendixobject.set(this.name, boolvalue);
				this.selectedValue = boolvalue;
			} else {
				this.mendixobject.set(this.name, value);
				this.selectedValue = value;
			}
		}

		if (value !== '' && this.keyNodeArray[value]) {
			this.keyNodeArray[this.selectedValue].checked = true;
			this.keyNodeArray[this.selectedValue].defaultChecked = true;
		}	
	},
	
	//summary : stub function, will be used or replaced by the client environment
	onChange : function(){
            this.removeError();
	},
        
	postCreate : function(){
            // intantiate empty objects, arrays to prefent sharing along widgets
            this.mendixobject = null;
            this.keyNodeArray = null;
            this.handles = null;
            
		logger.debug(this.id + ".postCreate");
  
		this.keyNodeArray = {};
		if (this.readonly)
			this.attrDisable = true;
	
		this.initContext();
		this.actLoaded();
	},
 
	update : function(obj, callback) {
		logger.debug(this.id + ".update");
                this.removeError();

		if(this.handles){
			dojo.forEach(this.handles, function (handle, i) {
				mx.data.unsubscribe(handle);
			});
		}
		//load embedded
		var loaded = false;
		var errorhandled = false;

		if (obj) {

			this.mendixobject = obj;
			try {
				if (this.name != '') {
					var enumerationObj;
					//get enumeration for current attribute
					if(obj.getAttributeType(this.name) == 'Enum')
						enumerationObj = obj.getEnumKVPairs(this.name);
					else if(obj.getAttributeType(this.name) == 'Boolean')
					{
						enumerationObj = {};
						enumerationObj['true'] = this.captiontrue;
						enumerationObj['false'] = this.captionfalse;
					}
					this.initRadioButtonList(enumerationObj);
					loaded = true;
				}
			}
			catch (err) {
				console && console.error(this.id +'.update: error while loading attr ' + err);
				loaded = false;
			}

			var self = this;
                        
			var validationhandle = mx.data.subscribe({
			    guid     : obj.getGuid(),
			    val      : true,
			    callback : function(validations) {
                                var val = validations[0],
                                    msg = val.getReasonByAttribute(self.name);                            
                                if(self.readonly){
			    		val.removeAttribute(self.name);
			    	} else {                                
                                    if (msg) {
                                        self.addError(msg);
                                        val.removeAttribute(self.name);
                                    }
                                }
			    }
			});

			var refreshhandle = mx.data.subscribe({
			    guid     : obj.getGuid(),
			    callback : function(guid) {
			    	self.update(obj, callback);
			    }
			});
                        
                        var refreshAttHandle = mx.data.subscribe({
			    guid    : obj.getGuid(),
                            attr    : this.name,
			    callback : function(guid) {
			    	self.update(obj, callback);
			    }
			});
                        
                        this.handles = [validationhandle, refreshhandle, refreshAttHandle];

		} else {
			logger.warn(this.id + '.update: received null object');
		}
		callback && callback();			
	},        
	
	uninitialize : function(){
		logger.debug(this.id + ".uninitialize");
                if(this.handles){
			dojo.forEach(this.handles, function (handle, i) {
				mx.data.unsubscribe(handle);
			});
		}
	}
});