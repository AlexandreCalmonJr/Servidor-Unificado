Ext.namespace('SWS.UTIL');
Ext.namespace('SWS.ERR');
Ext.namespace('SWS.DATA');

SWS.UTIL.AdjustWindowSizeWithinPortal = function(targetWin)
{
	/*
	var portal_xy = SWS.PORTAL.Viewport.getSize();
	var targetWinSize = targetWin.getSize();
	if(targetWinSize.height > portal_xy.height)
	{
		targetWinSize.height = portal_xy.height - 10;
		targetWin.y = 10;
	}
	if(targetWinSize.width > portal_xy.width)
		targetWinSize.width = portal_xy.width;

	targetWin.setPagePosition(portal_xy.width/2 - targetWinSize.width/2, 
							portal_xy.height/2 - targetWinSize.height/2);
							
	*/

}
	
SWS.UTIL.Swshyperlink = function(url){
	var linkResult = SWS.PORTAL.MENU.GotoLinkByUrl(url);

	if(!linkResult)
		alert("[Swshyperlink] url(" + url + ") is invalid");
}

SWS.UTIL.MakeHyperLink = function(text, url){
	var swsLink = "javascript:SWS.UTIL.Swshyperlink('" + url + "');";
	var linkMsg = text.link(swsLink);

	return linkMsg;
}

SWS.UTIL.IsAdmin= function(){
	return (SWS.DATA.loginMode == "") ? false : parseInt(SWS.DATA.loginMode);
}

SWS.UTIL.ChangeLoginText= function(text){
	var obj = Ext.getCmp('login');
	if(obj)
		obj.setText(text);
}

SWS.UTIL.AddDeskMessage = function(summary, description)
{
	SWS.PORTAL.CONTAINER.RP.AddDeskMessage(summary, description);
}

SWS.UTIL.RemoveDeskMessage = function(summary, description)
{
	SWS.PORTAL.CONTAINER.RP.RemoveDeskMessage(summary, description);
}

SWS.UTIL.RefreshMe = function()
{
	SWS.UTIL.GetLeftNaviTreeComp().refreshNodeLink();
}

/* Note : this function must be used after form panel is displayed completely */
SWS.UTIL.SetFormItemDisable = function(formPanel, id, disabled)
{
	var o = null;
	for(var i=0; i < formPanel.form.items.length; i++)
	{
		if(formPanel.form.items.items[i].id == id)
		{
			o = formPanel.form.items.items[i];
			break;
		}
	}
	if(o == null)
		return;

	if(typeof o.zDisableHide != 'undefined')
	{
		var none = "";
		if(disabled && o.zDisableHide)
			none = "none";
		o.container.dom.parentNode.style.display = none;
	}
	o.setDisabled(disabled);
	if(disabled)
	{
		var t=Ext.fly(id);
		if(t)
		{
			t .up('div.x-form-item').addClass('sws-menu-disabled');
			var err = t .up('div.x-form-element').down('div.x-form-invalid-msg');
			if(err)
				err.addClass('sws-menu-disabled');
		}
	}
	else
	{
		var t=Ext.fly(id);
		if(t)
		{
			t.up('div.x-form-item').removeClass('sws-menu-disabled');
			var err = t.up('div.x-form-element').down('div.x-form-invalid-msg');
			if(err)
				err.removeClass('sws-menu-disabled');
		}
	}

}

SWS.UTIL.SetFormItemItemDisable = function(formPanel, idArray, disabled)
{
	for(var i=0; i < idArray.length; i++)
	{
		SWS.UTIL.SetFormItemDisable(formPanel, idArray[i], disabled);
	}
}

SWS.UTIL.InchToMM = function(inch)
{
	var mm = inch * 25.4;
	mm = mm.toFixed(0);
	return Number(mm);
	
}

SWS.UTIL.MMToInch = function(mm)
{
	var inch = mm / 25.4;
	inch = inch.toFixed(2);
	return Number(inch);
}

SWS.UTIL.CalcByte1024Unit = function(data) 
{
	data = (data / (1024)) * 10;
	data = Math.floor(data);
	data = data/10;
	return data;
}

Ext.namespace('SWS.UTIL.CHKV');
SWS.UTIL.CHKV.Empty = function(v) {
	if(v.length == 0)
	{
		return LN.FieldRequired;
	}
	return true;
}

SWS.UTIL.CHKV.Number = function(v, minNum, maxNum, allowEmpty, minLen, maxLen){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;		
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	
	if(v.search(/\D/) != -1)
		return LN.NumberRequired;
	if((typeof minNum == 'number') && (v < minNum))
		return String.format(LN.NumberMinErr, minNum);
	if((typeof maxNum == 'number') && (v > maxNum))
		return String.format(LN.NumberMaxErr, maxNum);
	if((typeof minLen == 'number') && (v.length < minLen))
		return String.format(LN.LengthMinErr, minLen);
	if((typeof maxLen == 'number') && (v.length > maxLen))
		return String.format(LN.LengthMaxErr, maxNum);
	return true;
}

/* Validation for Fax Phone number at machine settings in SWS2.0*/
SWS.UTIL.CHKV.SetupPhone = function(v, minLen, maxLen, allowEmpty){
	var phone = /[^0-9+ ]/;	
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;		
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;

	if(phone.test(v) == true)
		return _T("%%Please Input(0~9,Space,+)%%");//LN.PhoneErr;
	if((typeof minLen == 'number') && (v.length < minLen))
		return String.format(LN.LengthMinErr, minLen);
	if((typeof maxLen == 'number') && (v.length > maxLen))
		return String.format(LN.LengthMaxErr, maxLen);
	return true;
}


SWS.UTIL.CHKV.UserNameNotUTF8 = function(v, allowEmpty, minLen, maxLen, illegalSet, o){

	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	if(typeof maxLen == 'number' && v.length > maxLen){
		return String.format(LN.LengthMaxErr, maxLen);
	}
	
	if(typeof minLen == 'number' && v.length < minLen){
		return String.format(LN.LengthMinErr, minLen);
	}
	
	var patten = /[^A-Za-z0-9 +-.,'/*#&@]/;
	if(patten.test(v) == true){
		return _T("%%This field only allow alphabet letters, number(0~9), symbols(Space, +, -, ., ,, ', /, *, #, &, @).%%");
	}
	
	//remove white space
	var space = /^ | $/;
	while(space.test(v)){
		v = v.replace(/^ | $/g,  "");
	}	
	if(typeof o == 'object' && typeof o.setValue == 'function'){
		o.setValue(v);
	}	
	
	return true;		
}

SWS.UTIL.CHKV.FaxMachineID = function(v, allowEmpty, minLen, maxLen, illegalSet, o){

	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	if(typeof maxLen == 'number' && v.length > maxLen){
		return String.format(LN.LengthMaxErr, maxLen);
	}
	
	if(typeof minLen == 'number' && v.length < minLen){
		return String.format(LN.LengthMinErr, minLen);
	}
	
	var patten = /[^A-Za-z0-9 +-.,'/*#&@]/;
	if(patten.test(v) == true){
		return _T("%%This field only allow alphabet letters, number(0~9), symbols(Space, +, -, ., ,, ', /, *, #, &, @).%%");
	}

	if(typeof o == 'object' && typeof o.setValue == 'function'){
		o.setValue(v);
	}	
	
	return true;		
}

/* Validation for Fax Phone number at Addressbook in SWS2.0*/
SWS.UTIL.CHKV.Phone = function(v, minLen, maxLen, allowEmpty){
	var phone = /[^0-9#*\-]/;
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;		
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;

	if(phone.test(v) == true)
		return LN.PhoneErr;
	if((typeof minLen == 'number') && (v.length < minLen))
		return String.format(LN.LengthMinErr, minLen);
	if((typeof maxLen == 'number') && (v.length > maxLen))
		return String.format(LN.LengthMaxErr, maxLen);
	return true;
}

SWS.UTIL.CHKV.NumberLength = function(v, length, allowEmpty){
	
	var result = SWS.UTIL.CHKV.Number(v, null, null, allowEmpty);
	if(result != true)
		return result;
		
	if(v.length != 0 && v.length != length)
		return String.format(LN.NumberLengthErr, length);
	return true;
}

SWS.UTIL.CHKV.Float = function(v, minNum, maxNum, allowInt, allowEmpty, minLen, maxLen){
	var result = "";
	
	//check empty value
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	
	//check int value
	if(allowInt == true)
	{
		result = v.search(/^(\d+)(\.\d+)?$/); 
	}
	else
	{
		result = v.search(/^(\d+)(\.\d+)$/);
	}
	
	if(result == -1)
		return LN.FloatErr;
	
	if((typeof minNum == 'number') && (v < minNum))
		return String.format(LN.NumberMinErr, minNum);
	if((typeof maxNum == 'number') && (v > maxNum))
		return String.format(LN.NumberMaxErr, maxNum);
	if((typeof minLen == 'number') && (v.length < minLen))
		return String.format(LN.LengthMinErr, minLen);
	if((typeof maxLen == 'number') && (v.length > maxLen))
		return String.format(LN.LengthMaxErr, maxLen);
	return true;
}

SWS.UTIL.CHKV.IPv4 = function(v , allowEmpty){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;		
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	var pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
	var ipArray = v.match(pattern);
	//a.b.c.d
	if (ipArray == null)
		return LN.IPv4FormatErr;
	else {
		for (var i = 1; i < 5; i++) {
			var thisSegment = ipArray[i];
			//number[0:255]
			if (thisSegment > 255 || thisSegment < 0)
				return LN.IPv4NumberErr;
			}
	}
	return true;
}

SWS.UTIL.CHKV.IPV6_ADDR_UNSPECIFIED	= 0x1;
SWS.UTIL.CHKV.IPV6_ADDR_GLOB_UNICAST	= 0x2;
SWS.UTIL.CHKV.IPV6_ADDR_SITE_LOCAL	= 0x4;
SWS.UTIL.CHKV.IPV6_ADDR_LINK_LOCAL	= 0x8;
SWS.UTIL.CHKV.IPV6_ADDR_MULTICAST		= 0x10;

SWS.UTIL.CHKV.CheckCommonIPv6Addr = function(ipv6addr)
{
	var found_double_colon = 0, max_elem_len = 0;
	var i, intval;
	var ipv6addrelements = ipv6addr.split(":");

	if((ipv6addr.length > 39) || (ipv6addr.length < 2))
		return false;
	
	var patten = /[^0-9A-Fa-f:]/;
	
	if(patten.test(ipv6addr) == true){
		return false;
	}

	if(ipv6addr.charAt(ipv6addr.length -1) == ':' && ipv6addr.charAt(ipv6addr.length -2) != ':' )
		return false;
	if(ipv6addr.charAt(0) == ':' && ipv6addr.charAt(1) != ':' )
		return false;
	if((ipv6addrelements.length > 8) || (ipv6addrelements.length < 3))
		return false;

	if(ipv6addrelements[0].length == 0)
		intval = 0;
	else
		intval = parseInt(ipv6addrelements[0], 16);

	if(intval == NaN)
		return false;
	
	for(i=0; i < ipv6addrelements.length; i++)
	{
		if((ipv6addrelements[i].length == 0) && (i  != 0) && ( i != ipv6addrelements.length-1))
			found_double_colon++;
		if(max_elem_len < ipv6addrelements[i].length)
			max_elem_len = ipv6addrelements[i].length;
	}
	
	if(found_double_colon > 1)
		return false;
	if(max_elem_len > 4)
		return false;
	if( (found_double_colon == 0) && ipv6addrelements.length < 8)
		return false;		
	
    return true;
}


SWS.UTIL.CHKV.CheckIPv6Addr = function(strIPv6Addr, allowNoDeviceID)
{
	var ipv6addrelements = strIPv6Addr.split(":");
	var intval;
	
	if(!SWS.UTIL.CHKV.CheckCommonIPv6Addr(strIPv6Addr))
		return -1;
	if(allowNoDeviceID == false && strIPv6Addr.length > 2)
	{
		if(strIPv6Addr.charAt(strIPv6Addr.length -1) == ':' && strIPv6Addr.charAt(strIPv6Addr.length -2) == ':' )
			return -1;
	}
	
	if(ipv6addrelements[0].length == 0)
		intval = 0;
	else
		intval = parseInt(ipv6addrelements[0], 16);

	if((intval & 0xe000) == 0x2000)
		return SWS.UTIL.CHKV.IPV6_ADDR_GLOB_UNICAST;
	if((intval & 0xffc0) == 0xfec0)
		return SWS.UTIL.CHKV.IPV6_ADDR_SITE_LOCAL;
	if((intval & 0xffc0) == 0xfe80)
		return SWS.UTIL.CHKV.IPV6_ADDR_LINK_LOCAL;
	if(intval == 0xffff)
		return SWS.UTIL.CHKV.IPV6_ADDR_MULTICAST;

	for(var i=0, intval=0; i < ipv6addrelements.length; i++)
	{
		if(ipv6addrelements[i].length != 0)
			intval = parseInt(ipv6addrelements[i], 16);
	}

	if(intval == 0)
		return SWS.UTIL.CHKV.IPV6_ADDR_UNSPECIFIED;
	return -1;
}

SWS.UTIL.CHKV.IPv6 = function(v,allowEmpty, ipScope, allowNoDeviceID){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;		
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;

	var allowNoDevID = false;
	if((typeof allowNoDeviceID == 'boolean') && (allowNoDeviceID == true))
		allowNoDevID = true;
	var ipv6Scope = SWS.UTIL.CHKV.IPV6_ADDR_GLOB_UNICAST;
	if(typeof ipScope == 'number')
		ipv6Scope = ipScope;
	
	var ipType = SWS.UTIL.CHKV.CheckIPv6Addr(v, allowNoDevID);

	if(ipType == -1)
		return LN.IPv6FormatErr;
	if((ipType & ipv6Scope) == 0) {
		switch(ipv6Scope){
			case SWS.UTIL.CHKV.IPV6_ADDR_GLOB_UNICAST:
				return _T("%%This field only allows global IPv6 address%%");
			case SWS.UTIL.CHKV.IPV6_ADDR_LINK_LOCAL:
				return _T("%%This field only allows link-local IPv6 address%%");
			case SWS.UTIL.CHKV.IPV6_ADDR_MULTICAST:
				return _T("%%This field only allows multicast IPv6 address%%");
			default:
				return _T("%%The type of IPv6 address is invalid%%");
		}
	}
	
	return true;
}


SWS.UTIL.CHKV.MultiIPv4 = function(v , allowEmpty){

	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	var result = SWS.UTIL.CHKV.IPv4(v, false);
	if(result != true)
		return result;
	var patten = /^(22[4-9]|23[0-9])/;
	if(!patten.test(v))
		return LN.IPv4MulticastErr;
	return true;
}

SWS.UTIL.CHKV.BroadIPv4 = function(v , allowEmpty){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	var patten = /^255(\.255){3}$/;
	if(!patten.test(v))
		return LN.IPv4BroadcastErr;
	return true;
}

SWS.UTIL.CHKV.StaticIPv4 = function(v , allowEmpty){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	var result = SWS.UTIL.CHKV.IPv4(v , false);
	if(result != true)
		return result;
	result = SWS.UTIL.CHKV.MultiIPv4(v , false);
	if(result == true)
		return LN.StaticIPv4MulticastErr;
	result = SWS.UTIL.CHKV.BroadIPv4(v , false);
	if(result == true)
		return LN.StaticIPv4BroadcastErr;
	if (v == "0.0.0.0")
		return LN.StaticIPv4UnspecifiedErr;
	var arrIP = v.split(".");
	if(arrIP[0] == 0 || arrIP[3] == 0)
		return LN.StaticIPv4InvalidErr;
	return true;
}

SWS.UTIL.CHKV.Subnet = function(v , allowEmpty){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	var patten = /^(255|254|252|248|240|224|192|128|0){1,3}$/;
	var expectZero = false;
	var val;
	var result = SWS.UTIL.CHKV.IPv4(v , false);
	if(result != true)
		return result;
	var sArray = v.split(".");
	for(var i=0; i<sArray.length; i++){
		val = sArray[i];
		if( (val != 0) &&  (expectZero == true) )
			return LN.SubnetErr;
		if( val != 255 )
			expectZero = true;
		if( val.match(patten) == null )
			return LN.SubnetErr;
	}
	if(val >= 254)
		return LN.SubnetLastOctetErr;
	return true;
}

//TBV
SWS.UTIL.CHKV.Gateway = function(v, allowEmpty, ipAddr, subnet){
	var result,tp;
	result = SWS.UTIL.CHKV.StaticIPv4(v , allowEmpty);
	if(result != true)
		return result;

	if(typeof ipAddr == 'string' && typeof subnet == 'string') {
		var ipAddressOctets = ipAddr.split(".");
		var subnetAddressOctets = subnet.split(".");
		var gatewayAddressOctets = v.split(".");
		var tmp1, tmp2;
		
		for(var i=0; i<4; i++)
		{
			tmp1 = (parseInt(ipAddressOctets[i],10) & parseInt(subnetAddressOctets[i],10));
			tmp2 = (parseInt(subnetAddressOctets[i],10) & parseInt(gatewayAddressOctets[i],10)); 
			if( tmp1 != tmp2)
			{ 
				return LN.GatewayErr;
			}
		}		
	}
		
	return true;
}


SWS.UTIL.CHKV.UniCodeSet = function(v, allowEmpty , minLen, maxLen, illegalSet, o){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	if(typeof maxLen == 'number' && v.length > maxLen)
		return String.format(LN.LengthMaxErr, maxLen);
	
	if(typeof minLen == 'number' && v.length < minLen)
		return String.format(LN.LengthMinErr, minLen);
	
	var patten = /[^\W|\w]/;
	
	if(patten.test(v) == true){
		return LN.CharSetErr;
	}

	var err = /[<>"\\]/; 			//"
	if(err.test(v) == true)
		return LN.PrintableCharExceptionsErr;

	if(typeof illegalSet == 'string')
	{
		var illegalPatten = new RegExp("[" + illegalSet + "]");
		if(illegalPatten.test(v) == true){
			return String.format(LN.illegalSetErr, illegalSet);
		}
	}
	
	//remove white space
	var space = /^ | $/;
	while(space.test(v)){
		v = v.replace(/^ | $/g,  "");
	}
	if(typeof o == 'object' && typeof o.setValue == 'function'){
		o.setValue(v);
	}
	return true;
}

SWS.UTIL.CHKV.WebUrl = function(v, allowEmpty , minLen, maxLen, illegalSet, o){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	if(typeof maxLen == 'number' && v.length > maxLen)
		return String.format(LN.LengthMaxErr, maxLen);
	
	if(typeof minLen == 'number' && v.length < minLen)
		return String.format(LN.LengthMinErr, minLen);
	
	var patten = /[^\W|\w]/;
	
	if(patten.test(v) == true){
		return LN.CharSetErr;
	}

	var err = /[<>"\\]/; 
	if(err.test(v) == true)
		return LN.PrintableCharExceptionsErr;

	//remove white space
	var space = /^ | $/;
	while(space.test(v)){
		v = v.replace(/^ | $/g,  "");
	}

	if(typeof illegalSet == 'string')
	{
		var illegalPatten = new RegExp("[" + illegalSet + "]");
		if(illegalPatten.test(v) == true){
			return String.format(_T("%%Invalid Input%%"), illegalSet);
		}
	}
	
	if(typeof o == 'object' && typeof o.setValue == 'function'){
		o.setValue(v);
	}
	
	return true;
}

SWS.UTIL.CHKV.SLPScope = function(v, allowEmpty , minLen, maxLen, o){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	if(typeof maxLen == 'number' && v.length > maxLen)
		return String.format(LN.LengthMaxErr, maxLen);
	
	if(typeof minLen == 'number' && v.length < minLen)
		return String.format(LN.LengthMinErr, minLen);

	if(v.toUpperCase() == 'LOCAL' || v.toUpperCase() == 'REMOTE')
		return _T("%%The strings LOCAL and REMOTE cannot be used for scope names.%%");
	
	var patten = /[^0-9A-Za-z,/:]/;
	
	if(patten.test(v) == true){
		return _T("%%Alphanumeric characters, comma (,), forward slash (/) and colon (:) are allowed for scope names.%%");
	}

	//remove white space
	var space = /^ | $/;
	while(space.test(v)){
		v = v.replace(/^ | $/g,  "");
	}
	if(typeof o == 'object' && typeof o.setValue == 'function'){
		o.setValue(v);
	}
	return true;
}

SWS.UTIL.CHKV.Path = function(v, allowEmpty , minLen, maxLen, o){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	if(typeof maxLen == 'number' && v.length > maxLen)
		return String.format(LN.LengthMaxErr, maxLen);
	
	if(typeof minLen == 'number' && v.length < minLen)
		return String.format(LN.LengthMinErr, minLen);
	
	//code 32 ~ 126
	var patten = /[^( -~)]/;
	if(patten.test(v) == true)
		return LN.PrintableCharErr;	

	var err = /[<>"]/;	
	if(err.test(v) == true)
		return LN.PATHCharExceptionsErr;
		
	var err = /\\$|\/$|^\\|^\//;	
	if(err.test(v) == true)
		return LN.PathErr;
	
	//remove white space
	var space = /^ | $/;
	while(space.test(v)){
		v = v.replace(/^ | $/g,  "");
	}	
	if(typeof o == 'object' && typeof o.setValue == 'function'){
		o.setValue(v);
	}
	return true;
}

SWS.UTIL.CHKV.AsciiSet = function(v, allowEmpty , minLen, maxLen, illegalSet, o, removeWS){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	if(typeof maxLen == 'number' && v.length > maxLen)
		return String.format(LN.LengthMaxErr, maxLen);
	
	if(typeof minLen == 'number' && v.length < minLen)
		return String.format(LN.LengthMinErr, minLen);
	
	//code 32 ~ 26
	var patten = /[^( -~)]/;
	if(patten.test(v) == true)
		return LN.PrintableCharErr;	

	var err = /[<>"\\]/;	//"
	if(err.test(v) == true)
		return LN.PrintableCharExceptionsErr;
	
	if(typeof illegalSet == 'string')
	{
		var illegalPatten = new RegExp("[" + illegalSet + "]");
		if(illegalPatten.test(v) == true){
			return String.format(LN.illegalSetErr, illegalSet);
		}
	}
	
	//remove white space
	if((typeof removeWS != 'boolean') || (removeWS != false))
	{
		var space = /^ | $/;
		while(space.test(v)){
			v = v.replace(/^ | $/g,  "");
		}	
	
		if(typeof o == 'object' && typeof o.setValue == 'function'){
			o.setValue(v);
		}
	}
	return true;
}

SWS.UTIL.CHKV.AlphaPrintableChar = function(v, allowEmpty , minLen, maxLen, allowSpace){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	if(typeof maxLen == 'number' && v.length > maxLen)
		return String.format(LN.LengthMaxErr, maxLen);
	
	if(typeof minLen == 'number' && v.length < minLen)
		return String.format(LN.LengthMinErr, minLen);		
		
	var patten = /[^0-9A-Za-z]/;

	if(patten.test(v) == true)
		return LN.AlphaPrintableCharErr;	

	return true;
}

SWS.UTIL.CHKV.Domainname = function(v, allowEmpty , maxLen, allowUnderscore){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	if(v.length > maxLen)
		return String.format(LN.LengthMaxErr, maxLen);
	var hArray = v.split(".");
	var regDomain;
	if(allowUnderscore == true)
		regDomain = /[^a-zA-Z0-9\-_]+/;	
	else
		regDomain = /[^a-zA-Z0-9\-]+/;
	
	//Each label must be between 1 and 63 characters long
	for(var i=0 ; i<hArray.length; i++){
		var val = hArray[i];
		if(val.length < 1 || val.length > 63)
			return LN.DomainNameLabelLenErr;
		if(val.match(/^[-]|[-]$/))
			return LN.DomainNamehyphenErr;

		//patten = /[^a-zA-Z0-9\-]+/;
		//hostname's labels may contain only the ASCII letter , digits, and the hyphen
		if(val.match(regDomain))
		{
			if(allowUnderscore == true)
				return LN.DomainNameLabelErrUnderscore;
			else
				return LN.DomainNameLabelErr;
		}
	}
	
	return true;
}
/* not used */
SWS.UTIL.CHKV.Hostname = function(v, allowEmpty , maxLen){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	if(v.length > maxLen)
		return String.format(LN.LengthMaxErr, maxLen);
	
	if(v.search("."))
		return LN.HostNameLabelErr;
	
	//label must be between 1 and 63 characters long	
	var val = v;
	if(val.length < 1 || val.length > 63)
		return LN.HostNameLabelLenErr;
	if(val.match(/^[-]|[-]$/))
		return LN.HostNamehyphenErr;

	//patten = /[^a-zA-Z0-9\-]+/;
	//hostname's labels may contain only the ASCII letter , digits, and the hyphen
	if(val.match(/[^a-zA-Z0-9\-]+/))
		return LN.HostNameLabelErr;
	
	return true;
}

SWS.UTIL.CHKV.MACAddr = function(v, allowEmpty,  separator){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	var patten = new RegExp('^[0-9A-Fa-f]{2}(' + separator + '[0-9A-Fa-f]{2}){5}$');
	if(!patten.test(v))
		return _T("%%Invalid MAC address format%%");
	patten = new RegExp('^0{2}(' + separator + '0{2}){5}$');
	if(patten.test(v))
		return _T("%%Unspecified address%%");
	//broadcast address : FF-FF-FF-FF-FF-FF
	patten = new RegExp('^[Ff]{2}(' + separator + '[Ff]{2}){5}$');
	if(patten.test(v))
		return _T("%%Broadcast address%%");
	patten = new RegExp('^[0-9A-Fa-f]{2}');
	var mac = patten.exec();
	if(mac % 2 != 0)
		return _T("%%Multicast Address%%");
	return true;
}

SWS.UTIL.CHKV.Email = function(v, allowEmpty,  maxLen){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	var email = /^([A-Za-z0-9])([\w`\-=~!#$%&*?+_|{}'^./])*@([\w`\-=~!#$%&*?+_|{}'^./])+$/;

	if((typeof maxLen == 'number') && (v.length > maxLen))
		return String.format(LN.LengthMaxErr, maxLen);
		
	if(!email.test(v))			
			return LN.EmailFormatErr;
			
	return true;
}

SWS.UTIL.CHKV.EmailList = function(v, allowEmpty,  maxCnt, emailMaxLength, separator){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	var email = /^([A-Za-z0-9])([\w`\-=~!#$%&*?+_|{}'^./])*@([\w`\-=~!#$%&*?+_|{}'^./])+$/;

	var emailArr =  [];
	if(typeof separator == 'undefined')
		emailArr = v.split(',');
	else{
		emailArr = v.split(separator);
	}	
	
	if(emailArr.length > maxCnt)
		return String.format(LN.CntMaxErr, maxCnt);
		
	for(var i=0; i<emailArr.length; i++){
		if(!email.test(emailArr[i]))			
			return LN.EmailFormatErr;	
	}

	if(typeof emailMaxLength !== 'undefined')
	{
		for(var i=0; i<emailArr.length; i++){
			if(emailArr[i].length > emailMaxLength)
				return String.format(LN.EachEmailLenErr, emailMaxLength);
		}
	}
	
	return true;
}
SWS.UTIL.CHKV.File = function(v, allowEmpty,  maxLen, errMsg){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true) {
		if(typeof errMsg == 'string')
			return errMsg;
		return result;
	}
	if((typeof maxLen == 'number') && (v.length > maxLen))
		return _T("%%The maximum length is%%") + " " + maxLen;
	return true;
}

SWS.UTIL.CHKV.IP = function(v, allowEmpty, format){
	var result,tp;
	if((typeof format == 'string') && (format == "v6")){//ipv4
		result = SWS.UTIL.CHKV.IPv6(v , allowEmpty);
		if(result != true)
			return result;
	}else if( ((typeof format == 'string') && (format == "v4_v6")) ) {// ipv4_ipv6
		tp = SWS.UTIL.CHKV.IPv6(v , allowEmpty);
		if(tp == true)
			return true;
		result = SWS.UTIL.CHKV.IPv4(v , allowEmpty);
		if(result == true)
			return true;
		return tp+result;
	}else{ // ipv4 : default
		result = SWS.UTIL.CHKV.IPv4(v , allowEmpty);
		if(result != true)
			return result;
	}
	return true;
}
SWS.UTIL.CHKV.MultiIP = function(v, allowEmpty, format){
	var result,tp;
	if((typeof format == 'string') && (format == "v6")){//ipv4
		result = SWS.UTIL.CHKV.IPv6(v , allowEmpty);
		if(result != true)
			return result;
	}else if( ((typeof format == 'string') && (format == "v4_v6")) ) {// ipv4_ipv6
		tp = SWS.UTIL.CHKV.IPv6(v , allowEmpty);
		if(tp == true)
			return true;
		result = SWS.UTIL.CHKV.MultiIPv4(v , allowEmpty);
		if(result == true)
			return true;
		return tp+result;
	}else{ // ipv4 : default
		result = SWS.UTIL.CHKV.MultiIPv4(v , allowEmpty);
		if(result != true)
			return result;
	}
	return true;
}

SWS.UTIL.CHKV.BroadIP = function(v, allowEmpty, format){
	var result,tp;
	if((typeof format == 'string') && (format == "v6")){//ipv4
		result = SWS.UTIL.CHKV.IPv6(v , allowEmpty);
		if(result != true)
			return result;
	}else if( ((typeof format == 'string') && (format == "v4_v6")) ) {// ipv4_ipv6
		tp = SWS.UTIL.CHKV.IPv6(v , allowEmpty);
		if(tp == true)
			return true;
		result = SWS.UTIL.CHKV.BroadIPv4(v , allowEmpty);
		if(result == true)
			return true;
		return tp+result;
	}else{ // ipv4 : default
		result = SWS.UTIL.CHKV.BroadIPv4(v , allowEmpty);
		if(result != true)
			return result;
	}
	return true;
}

SWS.UTIL.CHKV.StaticIP = function(v, allowEmpty, format){
	var result,tp;
	if((typeof format == 'string') && (format == "v6")){//ipv4
		result = SWS.UTIL.CHKV.IPv6(v , allowEmpty);
		if(result != true)
			return result;
	}else if( ((typeof format == 'string') && (format == "v4_v6")) ) {// ipv4_ipv6
		tp = SWS.UTIL.CHKV.IPv6(v , allowEmpty);
		if(tp == true)
			return true;
		result = SWS.UTIL.CHKV.StaticIPv4(v , allowEmpty);
		if(result == true)
			return true;
		return tp+result;
	}else{ // ipv4 : default
		result = SWS.UTIL.CHKV.StaticIPv4(v , allowEmpty);
		if(result != true)
			return result;
	}
	return true;
}

SWS.UTIL.CHKV.FloatSupportMinus= function(v, minNum, maxNum, allowEmpty)
{ 
	var result = "";
		
	//check empty value
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;

	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	
	var patten = /^((-[0-9]+|[0-9]*)(\.?[0-9]?[0-9]?)?)/;
	result = patten.exec(v);
	if(result[0] != v)
		return LN.FloatErr;
	
	if((typeof minNum == 'number') && (v < minNum))
		return String.format(LN.NumberMinErr, minNum);
	if((typeof maxNum == 'number') && (v > maxNum))
		return String.format(LN.NumberMaxErr, maxNum);
	return true;

}

SWS.UTIL.CHKV.IntegerSupportMinus= function(v, minNum, maxNum, allowEmpty)
{ 
	var result = "";
		
	//check empty value
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;

	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	
	var patten = /^(-[0-9]+|[0-9]*)/;
	result = patten.exec(v);
	if(result[0] != v)
		return LN.NumberRequired;
	
	
	if((typeof minNum == 'number') && (v < minNum))
		return String.format(LN.NumberMinErr, minNum);
	if((typeof maxNum == 'number') && (v > maxNum))
		return String.format(LN.NumberMaxErr, maxNum);
	return true;

}

SWS.UTIL.CHKV.IntegerSupportPlusMinus= function(v, minNum, maxNum, allowEmpty)
{ 
 
	var result = "";
		
	//check empty value
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
/*
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
*/	
	var patten = /^((\+[0-9]+|-[0-9]+|[0-9]*)(\.?[0-9]?[0-9]?[0-9]?[0-9]?[0-9]?[0-9]?[0-9]?)?)/;

	result = patten.exec(v);
	if(result[0] != v)
		return String.format(LN.FloatPointDeical, 7);
	
	if((typeof minNum == 'number') && (v < minNum))
		return String.format(LN.NumberMinErr, minNum);
	if((typeof maxNum == 'number') && (v > maxNum))
		return String.format(LN.NumberMaxErr, maxNum);
	return true;
}


SWS.UTIL.CHKV.StrongPassword= function(v, minLen, maxLen, allowEmpty, alpahbetCount, numberCnt, symbolCnt)
{ 
	var result = "";
	var currentAlpahbetCnt = 0, currentSymbolCnt = 0, currentNumberCnt = 0;
	var theCharacter;

	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;

	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	if(typeof maxLen == 'number' && v.length > maxLen)
		return String.format(LN.LengthMaxErr, maxLen);
	
	if(typeof minLen == 'number' && v.length < minLen)
		return String.format(LN.LengthMinErr, minLen);

	for(var i=0;i<v.length;i++)
	{
		theCharacter = v.charAt(i);

		if((theCharacter >= "a") && (theCharacter <= "z"))
			currentAlpahbetCnt++;

		else if((theCharacter >= "A") && (theCharacter <= "Z"))
			currentAlpahbetCnt++;

		else if((theCharacter >= "0") && (theCharacter <= "9"))
			currentNumberCnt++;

		else
			currentSymbolCnt++;
	}
	if((currentAlpahbetCnt<alpahbetCount)||(currentNumberCnt<numberCnt)||(currentSymbolCnt<symbolCnt))
	{
		return String.format(_T("%%Password must be at least {0} characters long and at least 1 number,1 special character and alphabetical%%"), minLen);
	}
	return true;

}

SWS.UTIL.CHKV.FileName = function(v, minLen, maxLen, allowEmpty){
	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	if(typeof maxLen == 'number' && v.length > maxLen)
		return String.format(LN.LengthMaxErr, maxLen);
	
	if(typeof minLen == 'number' && v.length < minLen)
		return String.format(LN.LengthMinErr, minLen);
	
	//code 32 ~ 26
	var patten = /[^( -~)]/;
	if(patten.test(v) == true)
		return LN.PrintableCharErr;	

	var err = /[<>"\\]/;	//"
	if(err.test(v) == true)
		return LN.PrintableCharExceptionsErr;

	var patten = /[^A-Za-z0-9 `\-@~!#\$%&()_{}'\^.]/;
	if(patten.test(v) == true){
		return _T("%%This field only allow alphabet letters, number(0~9), symbols(Space, `, -, @, ~, !, #, $, %, &, (, ), _, {, }, ', ^, .).%%");
	}
	
	//remove white space
	if((typeof removeWS != 'boolean') || (removeWS != false))
	{
		var space = /^ | $/;
		while(space.test(v)){
			v = v.replace(/^ | $/g,  "");
		}	
	
		if(typeof o == 'object' && typeof o.setValue == 'function'){
			o.setValue(v);
		}
	}
	return true;
}

SWS.UTIL.CHKV.LocalUserID = function(v, minLen, maxLen, allowEmpty, o){

	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	if(typeof maxLen == 'number' && v.length > maxLen){
		return String.format(LN.LengthMaxErr, maxLen);
	}
	
	if(typeof minLen == 'number' && v.length < minLen){
		return String.format(LN.LengthMinErr, minLen);
	}

	
	var patten = /[^A-Za-z0-9 `\-~!#\$%&()_{}'\^.]/;
	if(patten.test(v) == true){
		return _T("%%This field only allow alphabet letters, number(0~9), symbols(Space, `, -, ~, !, #, $, %, &, (, ), _, {, }, ', ^, .).%%");
	}
	
	//remove white space
	var space = /^ | $/;
	while(space.test(v)){
		v = v.replace(/^ | $/g,  "");
	}	
	if(typeof o == 'object' && typeof o.setValue == 'function'){
		o.setValue(v);
	}	
	
	return true;		
}

SWS.UTIL.CHKV.DomainField = function(v, minLen, maxLen, allowEmpty, o){

	if((typeof allowEmpty == 'boolean') && (allowEmpty == true) && (v.length == 0))
		return true;
	var result = SWS.UTIL.CHKV.Empty(v);
	if(result != true)
		return result;
	if(typeof maxLen == 'number' && v.length > maxLen){
		return String.format(LN.LengthMaxErr, maxLen);
	}
	
	if(typeof minLen == 'number' && v.length < minLen){
		return String.format(LN.LengthMinErr, minLen);
	}

	
	var patten = /[^A-Za-z0-9 `\-~!#\$%&()_{}'\^.]/;
	if(patten.test(v) == true){
		return _T("%%This field only allow alphabet letters, number(0~9), symbols(Space, `, -, ~, !, #, $, %, &, (, ), _, {, }, ', ^, .).%%");
	}
	
	//remove white space
	var space = /^ | $/;
	while(space.test(v)){
		v = v.replace(/^ | $/g,  "");
	}	
	if(typeof o == 'object' && typeof o.setValue == 'function'){
		o.setValue(v);
	}	
	
	return true;		
}
Ext.namespace('SWS.UTIL.CHKO');
SWS.UTIL.CHKO.Empty = function(o) {
	var result = SWS.UTIL.CHKV.Empty(o.getRawValue());
	if(result == true)
	{
		o.validate();
		return true;
	}

	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.Number = function(o) {
	var result = SWS.UTIL.CHKV.Number(o.getRawValue(), o.zValidator.minNum, o.zValidator.maxNum, o.zValidator.allowEmpty, o.zValidator.minLen, o.zValidator.maxLen);
	if(result == true)
	{
		o.validate();
		return true;
	}

	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.SetupPhone = function(o) {
	var result = SWS.UTIL.CHKV.SetupPhone(o.getRawValue(), o.zValidator.minLen, o.zValidator.maxLen, o.zValidator.allowEmpty);
	if(result == true)
	{
		o.validate();
		return true;
	}

	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.UserNameNotUTF8 = function(o){

	var result = SWS.UTIL.CHKV.UserNameNotUTF8(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.minLen, o.zValidator.maxLen, o.zValidator.illegalSet, o);
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.FaxMachineID = function(o){

	var result = SWS.UTIL.CHKV.FaxMachineID(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.minLen, o.zValidator.maxLen, o.zValidator.illegalSet, o);
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.ABookPhone = function(o) {
	var result = SWS.UTIL.CHKV.Phone(o.getRawValue(), o.zValidator.minLen, o.zValidator.maxLen, o.zValidator.allowEmpty);
	if(result == true)
	{
		o.validate();
		return true;
	}

	o.markInvalid(result);
	return false;
}


SWS.UTIL.CHKO.Phone = function(o) {
	var result = SWS.UTIL.CHKV.Phone(o.getRawValue(), o.zValidator.minLen, o.zValidator.maxLen, o.zValidator.allowEmpty);
	if(result == true)
	{
		o.validate();
		return true;
	}

	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.NumberLength = function(o) {
	var result = SWS.UTIL.CHKV.NumberLength(o.getRawValue(), o.zValidator.length, o.zValidator.allowEmpty);
	if(result == true)
	{
		o.validate();
		return true;
	}

	o.markInvalid(result);
	return false;
}
SWS.UTIL.CHKO.Float = function(o) {
	var result = SWS.UTIL.CHKV.Float(o.getRawValue(), o.zValidator.minNum, o.zValidator.maxNum, o.zValidator.allowInt, o.zValidator.allowEmpty,  o.zValidator.minLen, o.zValidator.maxLen);
	if(result == true)
	{
		o.validate();
		return true;
	}

	o.markInvalid(result);
	return false;
}
SWS.UTIL.CHKO.IP = function(o) {
	var result = SWS.UTIL.CHKV.IP(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.format );
	if(result == true){
		o.validate();
		return true;
	}
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.MultiIP = function(o) {
	var result = SWS.UTIL.CHKV.MultiIP(o.getRawValue(),o.zValidator.allowEmpty, o.zValidator.format );
	if(result == true){
		o.validate();
		return true;
	}
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.BroadIP = function(o) {
	var result = SWS.UTIL.CHKV.BroadIP(o.getRawValue(), o.zValidator.allowEmpty,o.zValidator.format );
	if(result == true){
		o.validate();
		return true;
	}
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.StaticIP = function(o) {
	var result = SWS.UTIL.CHKV.StaticIP(o.getRawValue(),o.zValidator.allowEmpty, o.zValidator.format );
	if(result == true){
		o.validate();
		return true;
	}
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.IPv6 = function(o) {
	var result = SWS.UTIL.CHKV.IPv6(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.ipScope, o.zValidator.allowNoDeviceID );
	if(result == true){
		o.validate();
		return true;
	}
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.Subnet = function(o) {
	var result = SWS.UTIL.CHKV.Subnet(o.getRawValue(), o.zValidator.allowEmpty);
	if(result == true){
		o.validate();
		return true;
	}
	o.markInvalid(result);
	return false;
}


SWS.UTIL.CHKO.Gateway = function(o) {
	var result = SWS.UTIL.CHKV.Gateway(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.ipAddr, o.zValidator.subnet);
	if(result == true){
		o.validate();
		return true;
	}
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.Domainname = function(o) {
	var result = SWS.UTIL.CHKV.Domainname(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.maxLen, false);
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.IPorDomainname = function(o) {
	var value = o.getRawValue();
	var result;
	var patten = /[^\d.]/;
	if(value.match(patten))
	{
		//domainname
		result  = SWS.UTIL.CHKV.Domainname(value, o.zValidator.allowEmpty, o.zValidator.maxLen, true);		
	}
	else{
		//ip address		
		result  = SWS.UTIL.CHKV.StaticIP(value, o.zValidator.allowEmpty);
	}
	
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.IPorIPv6orDomainname = function(o) {
	var value = o.getRawValue();
	var result;
	var ipv4patten = /[^\d.]/;
	var ipv6patten = /:/;
	if(value.match(ipv4patten))
	{		
		if(value.match(ipv6patten)){
			//ipv6 address
			result = SWS.UTIL.CHKV.IPv6(value, o.zValidator.allowEmpty);			
		}
		else{
			//domainname
			result  = SWS.UTIL.CHKV.Domainname(value, o.zValidator.allowEmpty, o.zValidator.maxLen, true);		
		}
	}
	else{
		//ip address		
		result  = SWS.UTIL.CHKV.StaticIP(value, o.zValidator.allowEmpty);
	}
	
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}


SWS.UTIL.CHKO.Hostname = function(o) {
	var result = SWS.UTIL.CHKV.Hostname(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.maxLen);
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.UniCodeSet = function(o) {
	var result = SWS.UTIL.CHKV.UniCodeSet(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.minLen, o.zValidator.maxLen, o.zValidator.illegalSet, o);
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.WebUrl = function(o) {
	var result = SWS.UTIL.CHKV.WebUrl(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.minLen, o.zValidator.maxLen, o.zValidator.illegalSet, o);
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.SLPScope = function(o) {
	var result = SWS.UTIL.CHKV.SLPScope(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.minLen, o.zValidator.maxLen, o);
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.Path = function(o) {
	var result = SWS.UTIL.CHKV.Path(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.minLen, o.zValidator.maxLen, o);
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.AsciiSet = function(o) {
	var result = SWS.UTIL.CHKV.AsciiSet(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.minLen, o.zValidator.maxLen, o.zValidator.illegalSet, o, o.zValidator.removeWS);
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.AlphaPrintableChar = function(o) {
	var result = SWS.UTIL.CHKV.AlphaPrintableChar(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.minLen, o.zValidator.maxLen, o.zValidator.allowSpace, o);
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.MACAddr = function(o) {
	var result = SWS.UTIL.CHKV.MACAddr(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.separator);
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.Email = function(o) {
	var result = SWS.UTIL.CHKV.Email(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.maxLen);
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}
SWS.UTIL.CHKO.EmailList = function(o) {
	var result = SWS.UTIL.CHKV.EmailList(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.maxCnt, o.zValidator.emailMaxLength, o.zValidator.separator);
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}
SWS.UTIL.CHKO.File = function(o) {
	var result = SWS.UTIL.CHKV.File(o.getRawValue(), o.zValidator.allowEmpty, o.zValidator.maxCnt, o.zValidator.errMsg);
	if(result == true){		
		o.validate();
		return true;
	}	
	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.FloatSupportMinus = function(o) {
	var result = SWS.UTIL.CHKV.FloatSupportMinus(o.getRawValue(), o.zValidator.minNum, o.zValidator.maxNum, o.zValidator.allowEmpty);
	if(result == true)
	{
		o.validate();
		return true;
	}

	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.IntegerSupportMinus = function(o) {
	var result = SWS.UTIL.CHKV.IntegerSupportMinus(o.getRawValue(), o.zValidator.minNum, o.zValidator.maxNum, o.zValidator.allowEmpty);
	if(result == true)
	{
		o.validate();
		return true;
	}

	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.IntegerSupportPlusMinus = function(o) {
	var result = SWS.UTIL.CHKV.IntegerSupportPlusMinus(o.getRawValue(), o.zValidator.minNum, o.zValidator.maxNum, o.zValidator.allowEmpty);
	if(result == true)
	{
		o.validate();
		return true;
	}

	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.StrongPassword = function(o) {
	var result = SWS.UTIL.CHKV.StrongPassword(o.getRawValue(), o.zValidator.minLen, o.zValidator.maxLen, o.zValidator.allowEmpty, o.zValidator.alpahbetCnt, o.zValidator.numberCnt, o.zValidator.symbolCnt);
	if(result == true)
	{
		o.validate();
		return true;
	}

	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.FileName = function(o) {
	var result = SWS.UTIL.CHKV.FileName(o.getRawValue(), o.zValidator.minLne, o.zValidator.maxLen, o.zValidator.allowEmpty);
	if(result == true)
	{
		o.validate();
		return true;
	}

	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.LocalUserID = function(o) {
	var result = SWS.UTIL.CHKV.LocalUserID(o.getRawValue(), o.zValidator.minLen, o.zValidator.maxLen, o.zValidator.allowEmpty, o);
	if(result == true)
	{
		o.validate();
		return true;
	}

	o.markInvalid(result);
	return false;
}

SWS.UTIL.CHKO.DomainField = function(o) {
	var result = SWS.UTIL.CHKV.DomainField(o.getRawValue(), o.zValidator.minLen, o.zValidator.maxLen, o.zValidator.allowEmpty, o);
	if(result == true)
	{
		o.validate();
		return true;
	}

	o.markInvalid(result);
	return false;
}

SWS.UTIL.AppGarbageCorrectorArray = new Array();
SWS.UTIL.RemoveRenderredAppPage = function() {
	var len = SWS.UTIL.AppGarbageCorrectorArray.length;

	for(var i=0; i < len; i++)
	{
		var pp = SWS.UTIL.AppGarbageCorrectorArray.pop();
		SWS.UTIL.GetAppPanelComp().remove(pp);
	}
	SWS.UTIL.GetAppPanelComp().doLayout();
}


SWS.UTIL.RenderAppPage = function(appObj) {
//	SWS.UTIL.AppGarbageCorrectorArray.push(appObj);
//	SWS.UTIL.GetAppPanelComp().add(appObj);
	SWS.UTIL.GetAppPanelComp().zAddComponent(appObj);
}

SWS.UTIL.GetAppPanelComp = function() {
	return Ext.getCmp('ID_Portal_AppPanel');
}

SWS.UTIL.OpenPopupWindow = function(url){	
	
	if(typeof SWS.UTIL.GetPopupPanelComp() != 'undefined'){		
		SWS.UTIL.PopupWin.zReLoadPage(url);	
		return ;
	}
		
	SWS.UTIL.PopupWin = new SWS.UI.DIALOG.Popup({
		width:558,
		height:562
	});
	
	SWS.UTIL.PopupWin.show();
	SWS.UTIL.PopupWin.setVisible(false);
	SWS.UTIL.PopupWin.zReLoadPage(url);
}

SWS.UTIL.GetBbarPopupPage = function() {
	return Ext.getCmp('ID_Portal_PopupPanel').getBottomToolbar();
}

SWS.UTIL.RenderPopupPage = function(appObj, title, w, h) {
	
	SWS.UTIL.GetPopupPanelComp().zAddComponent(appObj ,title,w, h);		
}

SWS.UTIL.GetPopupPanelComp = function() {
	return Ext.getCmp('ID_Portal_PopupPanel');
}

SWS.UTIL.GetLeftNaviTreeComp = function() {
	return Ext.getCmp('ID_Portal_NaviPanel');
}

SWS.UTIL.GetCenterPanelComp = function() {
	return Ext.getCmp('ID_Portal_CenterPanel');
}

SWS.UTIL.GetTopPanelComp = function() {
	return Ext.getCmp('ID_Portal_Top_Horizontal_Menu');
}

SWS.UTIL.GetInfoDeskPanelComp = function() {
	return Ext.getCmp('ID_Portal_EastPanel');
}

SWS.UTIL.HideNaviTreePanel = function() {
	SWS.UTIL.GetLeftNaviTreeComp().hide();
	SWS.UTIL.GetCenterPanelComp().doLayout();
}

SWS.UTIL.ShowNaviTreePanel = function() {
	SWS.UTIL.GetLeftNaviTreeComp().show();
	SWS.UTIL.GetCenterPanelComp().doLayout();
}

SWS.UTIL.infoDeskForceCollapsed = false;
SWS.UTIL.ForceCollapseInfoDeskPanel = function() {
	var infoDeskComp = SWS.UTIL.GetInfoDeskPanelComp();
	if(SWS.UTIL.infoDeskForceCollapsed)
		return;
	
	if(infoDeskComp.zCollapsedByUser){
		infoDeskComp.collapse();
		infoDeskComp.zCollapsedByUser = true;
	}else{
		infoDeskComp.collapse();
		infoDeskComp.zCollapsedByUser = false;
	}
	
	infoDeskComp.zSetCollapsedDisableMode(true);
	SWS.UTIL.infoDeskForceCollapsed = true;
}

SWS.UTIL.ForceExpandInfoDeskPanel = function() {
	var infoDeskComp = SWS.UTIL.GetInfoDeskPanelComp();
	if(!SWS.UTIL.infoDeskForceCollapsed)
		return;
	
	SWS.UTIL.infoDeskForceCollapsed = false;	
	infoDeskComp.zSetCollapsedDisableMode(false);	
	if(infoDeskComp.zCollapsedByUser)
		return;
	var eastRegion = SWS.PORTAL.Viewport.items.items[0].layout.east;	
	
	if(eastRegion.isSlid){
        eastRegion.afterSlideIn();
        eastRegion.panel.expand(false);
    }else{
        eastRegion.panel.expand();
    }      
}

SWS.UTIL.DisableInfoDeskPanel = function(b) {
	SWS.UTIL.GetInfoDeskPanelComp().zSetCollapsedDisableMode(b);
//	SWS.UTIL.GetInfoDeskPanelComp().setDisabled(b);
	SWS.UTIL.GetCenterPanelComp().doLayout();
}


SWS.UTIL.GetAvailableAppBodySize = function() {
	var size =  SWS.UTIL.GetAppPanelComp().getSize();
	size.width -= 8;	/*padding(3)x2 + border(1)x2 except scrollbar width*/
	size.height -= 47;	/*padding(5)x2 + title height(37) except scrollbar width*/
	return size;
}


SWS.UTIL.SyncLoadSrc = function(url) {
	var AJAX;
	if (window.XMLHttpRequest) {                  
		AJAX=new XMLHttpRequest();                
	} else 
	{                                      
		AJAX=new ActiveXObject("Microsoft.XMLHTTP");  
	}  
	if (AJAX) {     
		AJAX.open("GET", url, false);
		AJAX.send(null);     
		if (AJAX.status == 200 & AJAX.readyState==4) 
			return AJAX.responseText;
		return false;
	} else {     
		return false;  
	} 	
}

SWS.UTIL.SyncLoadJS = function(url) {
	var source = SWS.UTIL.SyncLoadSrc(url);
	if(source == false)
		return false;

	eval(source);
	return true;
}


SWS.UTIL.ParseJson= function(responseText) {
	var fnDecodeStringObj = function(obj) {
		var i;
		if(Ext.isArray(obj)) {
			for(i=0; i < obj.length; i++)
				obj[i] = fnDecodeStringObj(obj[i]);
		}
		else if(typeof obj == 'object') {
			for(var ele in obj)
				obj[ele] = fnDecodeStringObj(obj[ele] );
		}
		else if(typeof obj == 'string') {
			obj = unescape(obj);
			obj = obj.replace(/%5C%22/gi, "\""); /* "	*/
		}

		return obj;
	};

	var quoteEscapeText = responseText.replace(/\\\"/gi, "%5C%22");  /* "	*/
	var quoteList = quoteEscapeText.split("\"");
	var encodingText = "";
	for(var j=0; j < quoteList.length; j++) {
		if(((j + 1) % 2) == 0)
			quoteList[j] = escape(quoteList[j]);
		if(j != 0)
			encodingText += "\"";
		encodingText += quoteList[j];
	}

	var obj = Ext.util.JSON.decode(encodingText);
	obj = fnDecodeStringObj(obj);
	return obj;
}

SWS.UTIL.SyncLoadJOSN = function(url) {
	var AJAX;
	if(SWS.DATA.debugMode)
	{			
		url = url.replace( /^\/sws\/app/gi, "/sws/app_debug");		
	}
	
	if (window.XMLHttpRequest) {                  
		AJAX=new XMLHttpRequest();                
	} 
	else 
	{                                      
		AJAX=new ActiveXObject("Microsoft.XMLHTTP");  
	}  
	
	if (AJAX) {     
		
		AJAX.open("GET", url, false);
		AJAX.send(null);     

		if (AJAX.status == 200 & AJAX.readyState==4) 
		{
			var obj = SWS.UTIL.ParseJson(AJAX.responseText);

			if(obj.authRequired == true) {
				return {retCode: SWS.DATA.JSON.authFailure, obj: new SWS.UI.PANEL.errPanel({zText:_T("%%This document is protected. You must send a proper authorization information to access it.%%")})};				
			}
			return {retCode: SWS.DATA.JSON.success, obj: obj};
		}
		else if(AJAX.status == 404)
			return {retCode: SWS.DATA.JSON.notFound, obj: new SWS.UI.PANEL.errPanel({zText:_T("%%Page Not Found%%")})};
		else if(AJAX.status == 401)
			return {retCode: SWS.DATA.JSON.authFailure, obj: new SWS.UI.PANEL.errPanel({zText:_T("%%This document is protected. You must send a proper authorization information to access it.%%")})};
		else
			return {retCode: SWS.DATA.JSON.unKnownErr, obj: new SWS.UI.PANEL.errPanel({zText:_T("%%Unknown Error%%")})};
	} 

	return {retCode: SWS.DATA.JSON.internalErr, obj: new SWS.UI.PANEL.errPanel({zText:_T("%%Internal Error Occurred%%")})};
}

SWS.UTIL.DataArray = function(data){
	this.data = data;	
};

SWS.UTIL.DataArray.prototype.GetText = function(value){ 
	for(var i=0; i<this.data.length; i++)
	{
		if( this.data[i][1] == value )
			return this.data[i][0];	
	}
	return "";
}

SWS.UTIL.DataArray.prototype.GetData = function(){
	return this.data;
}

SWS.UTIL.MakeNumberStoreData = function(min, max, str){
	var data = [];
	for(var i=min,j=0; i<=max; i++,j+=1){
		data.push([i + str, i]);
	}
	return data;
}

SWS.UTIL.MakeNumberStoreDataTimeHours = function(min, max, str){
	var data = [];
	var strHour = _T("%%hour%%");

	for(var i=min,j=0; i<=max; i++,j+=1){
		if(i == 0 || i == 1)
			data.push([i + " " + strHour, i]);
		else
			data.push([i + str, i]);
	}
	return data;
}

SWS.UTIL.MakeNumberStoreDataTimeMinutes = function(min, max, str){
	var data = [];
	var strMinute =  LN.minute;

	for(var i=min,j=0; i<=max; i++,j+=1){
		if(i == 0 || i == 1)
			data.push([i + " " + strMinute, i]);
		else
			data.push([i + str, i]);
	}
	return data;
}

SWS.UTIL.MergeObject = function(to, from) {
	if(typeof from != 'object')
		return to;
	for(var item in from) {
		to[item]= from[item];
	}
	return to;
}

SWS.UTIL.AjaxCommonHandler = function(response) {
	var fnCheckResponseAndReturn = function(response) {
		var resp = response || {};

		if(typeof resp.status != 'number')
			resp.status = 0;
		if(typeof resp.result != 'object')
			resp.result = {};
		if(typeof resp.result.success != 'boolean')
			resp.result.success = false;
		 if(typeof response.result.errno != 'number')
		 	response.result.errno = 0;
		return resp;
	};
	
	var fnShowErrorWithUnformatedResp = function(msg) {
		var errMsg = _T("%%Incomplete response received from server%%");
		if(typeof msg == 'string')
			errMsg = msg;
		if((typeof response == 'object') && (typeof response.options == 'object') && 
			(response.options.zIgnoreFailureMsg == true))
			return;
		if((typeof response == 'object') && (typeof response.result.authRequired == 'boolean') && 
			response.result.authRequired == true)
			return;
		
		SWS.UI.WarningMsg(LN.Error, errMsg);
	};
	if(typeof response != 'object') {
		fnShowErrorWithUnformatedResp();
		return fnCheckResponseAndReturn(response);
	}
	if(typeof response.status != 'number') {
		fnShowErrorWithUnformatedResp();
		return fnCheckResponseAndReturn(response);
	}
	if(response.status == 200){ 
		if(typeof response.result != 'object'){
			fnShowErrorWithUnformatedResp();
			return fnCheckResponseAndReturn(response);
		}
			
		if(typeof response.result.success != 'boolean') {
			fnShowErrorWithUnformatedResp();
			return fnCheckResponseAndReturn(response);
		}
		if(response.result.success == false)
		{
			var msg;
			msg = LN.ErrReported;

			if(typeof response.result.errors == 'object'){
				var errNum = 0;
				for( var tmp in response.result.errors)
					errNum++;
				if(errNum > 0)
				{
					msg += "<br> " + LN.ErrorMarked + " : <img style='vertical-align:top' src='images/sws/icon_alert_error_16.gif' ext:qtip='" + LN.ConfigurationError + "'>.";
					if(typeof response.options == 'object' && typeof response.options.MarkSetError == 'function')
						response.options.MarkSetError(response.result.errors);
				}
			}
			if(typeof response.result.errmsg == 'string'){
				msg += "<br>" + _T(response.result.errmsg);
			}
			else if(typeof response.result.errno == 'number'){
				msg += "<br>";
				if(response.result.errno == SWS.ERR.JSPErrorNo.USERPROFILE_EXIST.no){
					msg += response.options.zDuplicateFieldErrMsg + " : ";
				}			
				msg += SWS.ERR.GetMsgByErrNo(response.result.errno);	
			}
			else if(typeof response.result.replacemsg == 'string'){
				msg = _T(response.result.replacemsg);
			}
			
			fnShowErrorWithUnformatedResp(msg);
			return fnCheckResponseAndReturn(response);
		}
		
		if((typeof response == 'object') && (typeof response.options == 'object') && 
			(response.options.zIgnoreSuccessMsg == true))
			return fnCheckResponseAndReturn(response);
		
		SWS.UI.InforMsg(LN.Success,LN.SuccessMsg);
		return fnCheckResponseAndReturn(response);
	}
	else if(response.status == -1 || response.status == 0){ 
		var msg = LN.NoResponse + "<br>" + LN.RetryMsg;
		fnShowErrorWithUnformatedResp(msg);
		return fnCheckResponseAndReturn(response);
	}
	else if(response.status == 404){ 
		var msg = LN.PageNotFound + "<br>" + LN.URLNotFound;
		fnShowErrorWithUnformatedResp(msg);
		return fnCheckResponseAndReturn(response);
	}
	
	var msg = LN.UnknownErrRcv;
	fnShowErrorWithUnformatedResp(msg);
	return fnCheckResponseAndReturn(response);
}

/* This can be used for success or failure handler of Ajax Request */
SWS.UTIL.AjaxResponseHandler = function(resp, options) {
	var response = {};

	if(typeof resp == 'object')	{
		if(typeof resp.status == 'number')
			response.status = resp.status;
		if(typeof resp.responseText == 'string' && resp.responseText.length > 0)
			response.result = SWS.UTIL.ParseJson(resp.responseText);
	}
	if(typeof options == 'object')
		response.options = options;
		
	return SWS.UTIL.AjaxCommonHandler(response);
}

/* This can be used for callback handler of Ajax Request */
SWS.UTIL.AjaxResponseCallback = function(options, success, resp) {
	var response = {};

	if(typeof resp == 'object')	{
		if(typeof resp.status == 'number')
			response.status = resp.status;
		if(typeof resp.responseText == 'string' && resp.responseText.length > 0)
			response.result = SWS.UTIL.ParseJson(resp.responseText);
	}
	if(typeof options == 'object')
		response.options = options;

	return SWS.UTIL.AjaxCommonHandler(response);
}

SWS.UTIL.AjaxRequest = function(userConfig){
	var fnMergeConfig = function(predefined, userConfig) {
		if(typeof userConfig != 'object')
			return predefined;
		for(var item in userConfig) {
			predefined[item]= userConfig[item];
		}
	};
	var ajaxConfig = {	
		disableCachingParam: '', 
		method: "POST",
		timeout: 10000
	};

	fnMergeConfig(ajaxConfig, userConfig);
	return Ext.Ajax.request(ajaxConfig);
}


/* This can be used for success or failure handler of Connection Request */
SWS.UTIL.ConnResponseHandler = function(resp, options) {
	return SWS.UTIL.AjaxResponseHandler(resp, options);
}

/* This can be used for callback handler of Connection Request */
SWS.UTIL.ConnResponseCallback = function(options, success, resp) {
	return SWS.UTIL.AjaxResponseCallback(options, success, resp);
}


SWS.UTIL.ConnRequest = function(userConfig){
	var fnMergeConfig = function(predefined, userConfig) {
		if(typeof userConfig != 'object')
			return predefined;
		for(var item in userConfig) {
			predefined[item]= userConfig[item];
		}
	};
	var connConfig = {	
		disableCachingParam: '', 
		method: "POST",
		timeout: 10000
	};

	if(typeof userConfig == 'object' && typeof userConfig.params == 'undefined')
	{		
		connConfig.params = {sws:'request', 'csrf-token' : SWS.DATA.csrfToken};
 	}
	else
		userConfig.params["csrf-token"] = SWS.DATA.csrfToken;	
	var handleResponse = function(response){
		var isSuccess = true;
		
		if(typeof response == 'object')	{
			if(typeof response.responseText == 'string' && response.responseText.length > 0)
				response.result = SWS.UTIL.ParseJson(response.responseText);
			if(typeof response.result == 'object' && response.result.success == false)
				isSuccess = false;	
		}

		this.transId = false;
		var options = response.argument.options;
		response.argument = options ? options.argument : null;
		this.fireEvent("requestcomplete", this, response, options);
		if(isSuccess)
			Ext.callback(options.success, options.scope, [response, options]);
		else
		        Ext.callback(options.failure, options.scope, [response, options]);
		Ext.callback(options.callback, options.scope, [options, true, response]);
	};

	var conn = new Ext.data.Connection();
	conn.handleResponse = handleResponse;

	fnMergeConfig(connConfig, userConfig);
	if(connConfig.zIgnoreUILock == true)
		;
	else {
		conn.on('beforerequest', SWS.UI.Lock, this);
		conn.on('requestcomplete', SWS.UI.Unlock, this);
		conn.on('requestexception', SWS.UI.Unlock, this);	
	}
	conn.request(connConfig);
	return conn;
}

SWS.UTIL.SubmitResponseHandler = function(form, action) {
	var response = {};

	if(typeof action.form == 'object')	{
		if((typeof action == 'object') && (typeof action.response == 'object') && (typeof action.response.status == 'number'))
			response.status = action.response.status;
		if((typeof action == 'object') && (typeof action.result == 'object'))
			response.result = action.result;
	}
	else	{
		if((typeof form == 'object') && (typeof form.status == 'number'))
			response.status = form.status;		
		if((typeof form == 'object') && (typeof form.responseText == 'string') && (form.responseText.length  > 0)) {
			response.result = SWS.UTIL.ParseJson(form.responseText);
		}
	}
	if(typeof form == 'object') {
		response.options = form;

		if(typeof response.status != 'number' && form.fileUpload == true) {
			response.status = 200; // in case of fileupload, status is not visuable. why?
		}
	}

	return SWS.UTIL.AjaxCommonHandler(response);
}


SWS.UTIL.MakeRowExpanderTpl = function(obj, titleWidth) {
	var tpl = "<div style='padding:10px;background:white;width:100%;'>";
	var oneColTable = "<table width='100%'> <tr><td><table width='100%'><tr><td style='width:{0};font-size:12px;line-height:18px;'> <b> {1} :</b></td>" + 
				"<td colspan=3 style='font-size:12px;line-height:18px;'> {2} </td></tr></table></td></tr></table>";
	var twoColTable = 	"<table width='100%'><tr><td width='50%'><table width='100%'><tr><td style='width:{0};font-size:12px;line-height:18px;'> <b> {1} :</b></td>" + 
				"<td style='width:\"50%\";font-size:12px;line-height:18px;'> {2} </td></tr></table></td>" + 
				"<td width='50%'><table width='100%'><tr><td style='width:{0};font-size:12px;line-height:18px;'> <b> {3} :</b></td>" + 
				"<td style='width:\"50%\";font-size:12px;line-height:18px;'> {4} </td></tr></table></td></tr></table>"
	var tWidth = 140;
	if(typeof titleWidth == 'number')
		tWidth = titleWidth;

	for(var i=0; i < obj.length; i++) {
		if(Ext.isArray(obj[i])){
			tpl += String.format(twoColTable, tWidth, obj[i][0].title, obj[i][0].desc, obj[i][1].title, obj[i][1].desc);
		}
		else{
			tpl += String.format(oneColTable, tWidth, obj[i].title, obj[i].desc);
		}			
	}
	tpl += "</div>";
	return tpl;
}

SWS.UTIL.EncodeBase64 = function(s) {
	var r = ""; var p = ""; 
	var i;
	var base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split("");
	var base64inv = {}; 
	var c = s.length % 3;
	for (var i = 0; i < base64chars.length; i++) { base64inv[base64chars[i]] = i; }

	if (c > 0) { for (; c < 3; c++) { p += '='; s += "\0"; } }
	for (c = 0; c < s.length; c += 3) {
		if (c > 0 && (c / 3 * 4) % 76 == 0) { r += "\r\n"; }
		var n = (s.charCodeAt(c) << 16) + (s.charCodeAt(c+1) << 8) + s.charCodeAt(c+2);
		n = [(n >>> 18) & 63, (n >>> 12) & 63, (n >>> 6) & 63, n & 63];
		r += base64chars[n[0]] + base64chars[n[1]] + base64chars[n[2]] + base64chars[n[3]];
	}

	return r.substring(0, r.length - p.length) + p;
}

SWS.UTIL.GotoURL = function(url, waitTime) {
	var timeout = 1000;
	if(typeof waitTime == 'number')
		timeout = waitTime;

	if(typeof url == 'string')
		setTimeout(function(){
					parent.location = url;
			}, timeout);
}

SWS.UTIL.Cookie = {
	Get: function(name, defRet){
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}
		return defRet;
	},
	Set: function(name, value){
		document.cookie = name+"="+value+"; path=/";
	},
	Clear: function(name){
		var expires = "";
		var date = new Date();
		date.setTime(date.getTime()+(-7*24*60*60*1000));
		expires = "; expires="+date.toGMTString();
		document.cookie = name+"=;"+expires+"; path=/";
	}
};

Number.prototype.toFixed = function(precision) 
{    
	var power = Math.pow(10, precision || 0);    
	return String(Math.round(this * power)/power);
}

SWS.UTIL.isMenuMoveLock = false;
SWS.UTIL.MenuMoveLock = function(){
	
	if(!SWS.UTIL.isMenuMoveLock){
		SWS.UTIL.isMenuMoveLock = true;
		return true;
	}
	else	
		return false;	
}
SWS.UTIL.MenuMoveUnlock = function(){
			
	setTimeout(function(){			
		SWS.UTIL.isMenuMoveLock = false;			
	}, 200);	
}

SWS.UTIL.isAvailableMenuMove = function(){
	
	if(SWS.UTIL.isMenuMoveLock)
		return false;
	return true;
	
}

SWS.TreeLoader = function(config){
    this.baseParams = {};
    Ext.apply(this, config);

    this.addEvents(
        "beforeload",
        "load",
        "loadexception"
    );

    SWS.TreeLoader.superclass.constructor.call(this);
};

Ext.extend(SWS.TreeLoader, Ext.util.Observable, {
    uiProviders : {},
    clearOnLoad : true,

 	baseAttrs: {
            iconCls: 'treenode-no-icon'
 	},
 	
    data: [],
    load : function(node, callback){
        if(this.clearOnLoad){
            while(node.firstChild){
                node.removeChild(node.firstChild);
            }
        }
        if(this.doPreload(node)){ // preloaded json children
            if(typeof callback == "function"){
                callback();
            }
        }else if(this.data){
            this.requestData(node, callback);
        }
    },

    doPreload : function(node){
        if(node.attributes.children){
            if(node.childNodes.length < 1){ // preloaded?
                var cs = node.attributes.children;
                node.beginUpdate();
                for(var i = 0, len = cs.length; i < len; i++){
                    var cn = node.appendChild(this.createNode(cs[i]));
                    if(this.preloadChildren){
                        this.doPreload(cn);
                    }
                }
                node.endUpdate();
            }
            return true;
        }else {
            return false;
        }
    },

    getParams: function(node){
        var buf = [], bp = this.baseParams;
        for(var key in bp){
            if(typeof bp[key] != "function"){
                buf.push(encodeURIComponent(key), "=", encodeURIComponent(bp[key]), "&");
            }
        }
        buf.push("node=", encodeURIComponent(node.id));
        return buf.join("");
    },

    requestData : function(node, callback){
        if(this.fireEvent("beforeload", this, node, callback) !== false){
        	this.handleResponse({callback: callback, node: node});
        }else{
            if(typeof callback == "function"){
                callback();
            }
        }
    },

    isLoading : function(){
        return !!this.transId;
    },

    abort : function(){
        if(this.isLoading()){
            //Ext.Ajax.abort(this.transId);
        }
    },

    createNode : function(attr){
        // apply baseAttrs, nice idea Corey!
        if(this.baseAttrs){
            Ext.applyIf(attr, this.baseAttrs);
        }
        if(this.applyLoader !== false){
            attr.loader = this;
        }
        if(typeof attr.uiProvider == 'string'){
           attr.uiProvider = this.uiProviders[attr.uiProvider] || eval(attr.uiProvider);
        }
        if(attr.nodeType){
            return new Ext.tree.TreePanel.nodeTypes[attr.nodeType](attr);
        }else{
            return attr.leaf ?
                        new Ext.tree.TreeNode(attr) :
                        new Ext.tree.AsyncTreeNode(attr);
        }
    },

    processResponse : function(node, callback){
        try {
            var o = this.data;
            node.beginUpdate();
            for(var i = 0, len = o.length; i < len; i++){
                var n = this.createNode(o[i]);
                if(n){
                    node.appendChild(n);
                }
            }
            node.endUpdate();
            if(typeof callback == "function"){
                callback(this, node);
            }
        }catch(e){
            this.handleFailure(this.data);
        }
    },

    handleResponse : function(a){
        this.transId = false;
        this.processResponse(a.node, a.callback);
        this.fireEvent("load", this, a.node, this.data);
    },

    handleFailure : function(a){
        this.transId = false;
        this.fireEvent("loadexception", this, a.node, this.data);
        if(typeof a.callback == "function"){
            a.callback(this, a.node);
        }
    }
});


SWS.UTIL.Export = function(url, params)
{
	var inputField = [];
	var el = Ext.get('sws_portal_export_iframe');
	if(el === null || el == 'undefined')
	{
		/* Below iframe will be removed when user move another menu. please refer SWS.PORTAL.CONTAINER.CENTER.APP.AppPanel. */
		Ext.DomHelper.append(Ext.get('sws_portal_iframe_body').up('div'), {
	        tag: 'iframe',
			id: 'sws_portal_export_iframe',
			name : 'sws_portal_export_iframe',						
			width:'0px',
			height:'0px',
	        style: "display:none;"
		});
	}

 	if(typeof params == 'object')
	{		
		for(var name in params)
		{
			inputField.push({
				tag:'input',
				type:'hidden',
				name: name,
				value: params[name]
			});
		}
 	}
	inputField.push({
				tag:'input',
				type:'hidden',
				name: 'csrf-token',
				value: SWS.DATA.csrfToken
	});
		
	var formEl = Ext.DomHelper.append(Ext.getBody(), {
        tag: 'form',
        action: url,
        method: 'post',
        target: 'sws_portal_export_iframe',
        style: 'display:none',     
        cn: inputField
	});

	formEl.submit();	
	Ext.removeNode(formEl);	
}

SWS.UTIL.isStopAutoLogout = false;
SWS.UTIL.StopAutoLogoutTime = function(stop)
{
	if(stop == true)
	{
		SWS.UTIL.isStopAutoLogout++;
	}
	else
	{
		if(SWS.UTIL.isStopAutoLogout != 0)
			SWS.UTIL.isStopAutoLogout--;
	}
}

SWS.UTIL.IsStopAutoLogoutTime = function()
{
	if(SWS.UTIL.isStopAutoLogout > 0)
		return true;
	return false;
}

SWS.UTIL.LogoutRequest = function(method) {
	var params = {logoutMethod : method};	

	SWS.UTIL.ConnRequest({
		url: "/sws/app/gnb/login/logout.jsp",
		success: function(form, action){

		},
		failure: function(form, action){

		},
		zIgnoreSuccessMsg: true,
		zIgnoreFailureMsg: true,
		params:params
	});
}

SWS.UTIL.RefreshSession = function() {
	var AJAX;
	if (window.XMLHttpRequest) {                  
		AJAX=new XMLHttpRequest();                
	} else 
	{                                      
		AJAX=new ActiveXObject("Microsoft.XMLHTTP");  
	}  
	if (AJAX) {     
		AJAX.open("GET", "/sws/app/gnb/login/RefreshSession.jsp", false);
		AJAX.send();    
		if (AJAX.status == 200 & AJAX.readyState==4) 
			return AJAX.responseText;
		return false;
	} else {     
		return false;  
	}
}


SWS.UTIL.MakeSWSData = function(text) {
	var rn = '';
	var auth;
	
	if(SWS.DATA.LoginExt1Support == "1") {

		if(text.length == 0)
			return "";
		
		for(var i=0; i < 16; i++)
			rn += Math.floor(Math.random() * 256);
		rn = rn.slice(0, 16);

		var sec = SWS.DATA.buyorProductName + SWS.DATA.productSerial;
		var skey = GibberishAES.enc(rn, sec);
		skey = skey.replace('\n', '');
		
		var sidpw = GibberishAES.enc(text, rn);
		sidpw = sidpw.replace('\n', '');
		auth = "Ext1 " + sidpw + ":" + skey;
	}else {
		auth = "Basic " + SWS.UTIL.EncodeBase64(text);
	}
	return auth;
}

Ext.lib.Ajax.serializeForm = function(F){
	if(typeof F=="string"){
		F=(document.getElementById(F)||document.forms[F])		
	}
	
	var el = Ext.fly(F.id);
	if(el){
		var appBody = el.up('div.x-panel');
		if(appBody){
			var formPanel = Ext.getCmp(appBody.id);
			if(formPanel)
				var filterOut = formPanel.zFilterOut;
		}
	}
	
	var G,E,H,J,K="",M=false;
	for(var L=0;L<F.elements.length;L++){
		G=F.elements[L];
		J=F.elements[L].disabled;
		E=F.elements[L].name;
		H=F.elements[L].value;		
		
		if(!J&&E){
			if(filterOut){
				var re = filterOut(E);
				if(re)
					continue;
			}
			switch(G.type){
				case"select-one":
				case"select-multiple":
					for(var I=0;I<G.options.length;I++){
						if(G.options[i].selected){
							if(Ext.isIE){
								K+=encodeURIComponent(E)+"="+encodeURIComponent(G.options[i].attributes["value"].specified?G.options[i].value:G.options[i].text)+"&"
							}else{
								K+=encodeURIComponent(E)+"="+encodeURIComponent(G.options[i].hasAttribute("value")?G.options[i].value:G.options[i].text)+"&"
							}
						}
					}
					break;
				case"radio":
					if(G.checked){
						K+=encodeURIComponent(E)+"="+encodeURIComponent(H)+"&"
					} 
					break;
				case"checkbox":
					if(G.checked){
						K+=encodeURIComponent(E)+"="+encodeURIComponent('1')+"&"
					} else {
						K+=encodeURIComponent(E)+"="+encodeURIComponent('0')+"&"
					}
					break;
				case"file":
				case undefined:
				case"reset":
				case"button":
					break;
				case"submit":
					if(M==false){
						K+=encodeURIComponent(E)+"="+encodeURIComponent(H)+"&";M=true
					}
					break;
				case "password":					
					K+=encodeURIComponent(E)+"="+encodeURIComponent(SWS.UTIL.MakeSWSData(H))+"&";
					break;
				default:
					K+=encodeURIComponent(E)+"="+encodeURIComponent(H)+"&";
					break
			}
		}
	}
	K=K.substr(0,K.length-1);
	return K
}

