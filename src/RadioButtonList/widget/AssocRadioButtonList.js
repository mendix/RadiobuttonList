
dojo.provide("RadioButtonList.widget.AssocRadioButtonList");

mxui.dom.addCss(require.toUrl("RadioButtonList/widget/ui/RadioButtonList.css"));

mxui.widget.declare('RadioButtonList.widget.AssocRadioButtonList', {
	//DECLARATION
	mixins       : [dijit._TemplatedMixin, mendix.addon._Contextable, mxui.mixin._ValidationHelper],
	templateString : '<div class="RadioButtonList"></div>',
	
	//IMPLEMENTATION
    _mxObj          : null,
	_mxObj   : null,
	nameName : '',
	attrDisable :false,
	selectedValue : null,
	keyNodeArray : null,
	handles : null,
	
    getListObjects : function(context) {
        	
        if (this.dataSourceType === "xpath") {
            var xpathString = '';
            if (context)
            {
                xpathString = "//" + this.RadioListObject + this.Constraint.replace(/'[%CurrentObject%]'/g, context);
            }
            else
            {
                xpathString = "//" + this.RadioListObject + this.Constraint;
            }
            mx.data.get({
                xpath    : xpathString,
                filter   :  {
                    limit   : 50,
                    depth	: 0,
                    sort    : [[this.sortAttr, this.sortOrder]]
                },
                callback : dojo.hitch(this, this.initRadioButtonList)
            });
        }
		else if(this.dataSourceType === "mf" && this.datasourceMf)
        {
            this.execMF(this._mxObj, this.datasourceMf, dojo.hitch(this, this.initRadioButtonList));
        }
        else {
            dojo.empty(this.domNode);
            var errordiv = mxui.dom.div("Can't retrieve objects because no datasource microflow is specified");
            dojo.attr(errordiv, "class", "alert alert-danger");
            this.domNode.appendChild(errordiv);
        }
        
	},
	
	initRadioButtonList : function(mxObjArr){
		dojo.empty(this.domNode);
		var $ = mxui.dom.create;
		var mxObj;
		
		var currentSelectedValue;
		
		if(this._mxObj.getReferences(this.assocName).length == 1) {
			this.selectedValue = currentSelectedValue = this._mxObj.getReferences(this.assocName)[0];
		}
		
		for (var i = 0; i < mxObjArr.length; i++) {
			mxObj = mxObjArr[i];
			
			var radioid = this.RadioListObject+'_'+this.id+'_'+i;
			
			var labelNode = $("label");

			dojo.attr(labelNode, 'disabled', this.attrDisable);
			
			var guid = mxObj.getGuid();
			var rbNode = $("input", {
				'type' : 'radio',
				'value' : guid ,
				'id' : radioid
			});

			dojo.attr(rbNode, 'name', "radio"+this._mxObj.getGuid()+'_'+this.id);

			this.keyNodeArray[guid] = rbNode;			
			dojo.attr(rbNode, 'disabled', this.attrDisable);
			
			if (currentSelectedValue === mxObj.getGuid()) {
				dojo.attr(rbNode,'defaultChecked', true);
			}
			
			var textDiv = $("span", mxObj.get(this.RadioListItemAttribute));
			
			labelNode.appendChild(rbNode);
			labelNode.appendChild(textDiv);
			
			this.connect(rbNode, "onclick", dojo.hitch(this, this.onclickRadio, mxObj.getGuid(), rbNode));			
			
			if(this.direction === "horizontal" ){
				dojo.addClass(labelNode, "radio-inline");
				this.domNode.appendChild(labelNode);
			} else {
				var radiodiv = $("div", {"class" : "radio"});
				radiodiv.appendChild(labelNode);
				this.domNode.appendChild(radiodiv);
			}			
		}			
	},
	
	onclickRadio : function( radioKey, rbNode) {
		logger.debug(this.id + ".onclickRadio");
		if (this.attrDisable)
			return;
			
		this.setValue(radioKey);
		dojo.attr(rbNode,'checked', true);
			
		this.onChange();
		this.triggerMicroflow();
	},
			
	setValue: function (value) {
		
		if ( this.selectedValue != null) {
			if (  this.selectedValue != '' && this.keyNodeArray[this.selectedValue] ) {
				this.keyNodeArray[this.selectedValue].checked = false;
				this.keyNodeArray[this.selectedValue].defaultChecked = false;
			}
		}
		this.selectedValue = value;

		if (this._mxObj != null) {
			this._mxObj.set(this.assocName, value);
		}
		if (value !== '' && this.keyNodeArray[value]) {
			this.keyNodeArray[this.selectedValue].checked = true;
			this.keyNodeArray[this.selectedValue].defaultChecked = true;
		}
	},
		
	triggerMicroflow : function() {
		logger.debug(this.id + ".triggerMicroflow");
		
		if (this.onchangeAction)
		{
			mx.data.action({
				params          : {
					applyto     : "selection",
					actionname  : this.onchangeAction,
					guids       : [this._mxObj.getGuid()]
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
	
	//summary : stub function, will be used or replaced by the client environment
	onChange : function(){
			this.removeError();
	},

	postCreate : function(){
		// intantiate empty objects, arrays to prefent sharing along widgets

		this.selectedValue = null;
		this.handles = null;
		
		logger.debug(this.id + ".postCreate");
		this.keyNodeArray = {};
		this.assocName = this.entity.split("/")[0];
		
		this.entity = this.assocName; //to catch data validation
		
		if (this.readonly)
			this.attrDisable = true;
	
		this.initContext();
		this.actLoaded();
	},
	
	update : function(obj, callback){
				this.removeError();
		logger.debug(this.id + ".update");
		if(this.handles){
			dojo.forEach(this.handles, function (handle, i) {
				mx.data.unsubscribe(handle);
			});
		}
		if(obj){
			this._mxObj = obj;

			var validationhandle = mx.data.subscribe({
				guid     : obj.getGuid(),
				val      : true,
				callback : dojo.hitch(this, function(validations) {
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
			
			this.getListObjects(this._mxObj);
		}
			
		callback && callback();
	},

	execMF : function (obj, mf, cb) {
			var params = {
				applyto		: "selection",
				actionname	: mf,
				guids : []
			};
			if (obj)
				params.guids = [obj.getGuid()];

			mx.data.action({
				params			: params,			
				callback		: function(objs) {
					cb && cb(objs);
				},
				error			: function(error) {
					cb  && cb();
					logger.warn(error.description);
				}
			}, this);
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
