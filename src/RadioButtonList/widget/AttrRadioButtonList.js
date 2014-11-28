dojo.provide("RadioButtonList.widget.AttrRadioButtonList");

mxui.dom.addCss(require.toUrl("RadioButtonList/widget/ui/RadioButtonList.css"));

mxui.widget.declare('RadioButtonList.widget.AttrRadioButtonList', {
	//DECLARATION
	mixins       : [dijit._TemplatedMixin, mendix.addon._Contextable, mxui.mixin._ValidationHelper],
	templateString : '<div class="RadioButtonList"></div>',
	
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
		var attrName = "" + this.mendixobject.get(this.entity);
		for (var key in enumObj) {
			var radioid = this.entity+'_'+this.id+'_'+i;
			
			var labelNode = $("label");
			dojo.attr(labelNode, 'disabled', this.attrDisable);

			var rbNode = $("input", {
				'type' : 'radio',
				'value' : key,
				'id' : radioid
			});
						
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
		this.setValue(enumkey);
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
	
	setValue : function (oldvalue) {
		var value = oldvalue;

		if ( this.selectedValue !== null) {
			if (  this.selectedValue != '' && this.keyNodeArray[this.selectedValue] ) {
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
				if (this.entity != '') {
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
					this.initRadioButtonList(enumerationObj);
					loaded = true;
				}
			}
			catch (err) {
				console && console.error(this.id +'.update: error while loading attr ' + err);
				loaded = false;
			}
						
			var validationhandle = mx.data.subscribe({
				guid     : obj.getGuid(),
				val      : true,
				callback : dojo.hitch(this,function(validations) {
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
				callback : dojo.hitch(this, function(guid) {
					this.update(obj, callback);
				})
			});
						
			var refreshAttHandle = mx.data.subscribe({
				guid    : obj.getGuid(),
				attr    : this.entity,
				callback : dojo.hitch(this, function(guid) {
					this.update(obj, callback);
				})
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