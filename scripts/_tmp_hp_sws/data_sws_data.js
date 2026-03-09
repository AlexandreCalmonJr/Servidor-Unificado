Ext.namespace('SWS.DATA');
Ext.namespace('SWS.DATA.JSON');

function CreateCookie(name,value,days) {
	var expires = "";
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		expires = "; expires="+date.toGMTString();
	}
	document.cookie = name+"="+value+expires+"; path=/";
}

function ReadCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

function EraseCookie(name) {
	CreateCookie(name,"",-7);
}

SWS.DATA.version = "2.0";
SWS.DATA.releaseYear = "2009";
SWS.DATA.buyorProductName = "HP HP Laser 408";
SWS.DATA.productSerial = "BRBST1F07Y";
SWS.DATA.LoginExt1Support = "1";
SWS.DATA.debugMode = ("10.71.3.110".indexOf(".") > 0) ? false : true;
SWS.DATA.PagingBarMaxValue = 30;
SWS.DATA.loginMode = "0";
SWS.DATA.csrfToken = "QlJCU1QxRjA3WQAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

SWS.DATA.LoadGlobalData = function(){
	var defLangCode= ReadCookie("language");

	if(defLangCode == null) {
		defLangCode = "";
		CreateCookie("language", defLangCode);
	}

	SWS.DATA.defaultLanguage = defLangCode;
	SWS.DATA.modelName = "HP Laser 408";
	SWS.DATA.deviceName = "HP Laser 408";
	
	if(SWS.DATA.debugMode) {
		SWS.DATA.AutoLogoutTime = 30 * 60;
		SWS.DATA.ServerServicedPort = 80;
	}
	else {
		SWS.DATA.SWSAdminUseAAA = 0;
		if(SWS.DATA.SWSAdminUseAAA)
		{
			SWS.DATA.AutoLogoutTime = 180;
		}
		else
		{
			SWS.DATA.AutoLogoutTime = (0 * 60);
		}
		
		SWS.DATA.ServerServicedPort = 443;
	}
}

SWS.DATA.LoadGlobalData();

SWS.DATA.mainBodyLargeWidth = 940;
Ext.isIE ? SWS.DATA.mainBodyMediumWidth = 910 : SWS.DATA.mainBodyMediumWidth = 920;  
SWS.DATA.mainBodySmallWidth = 791;
//SWS.DATA.menuLabelWidth = 238;
SWS.DATA.menuLabelWidth = 280;
SWS.DATA.menuLabelIdent = 20;

// resize for fieldset grid
SWS.DATA.FieldSetGridWidthCorrection = 100;
SWS.DATA.FieldSetTreeGridWidthCorrection = 125;
SWS.DATA.SMWidth = 30;


SWS.DATA.JSON.success = 0;
SWS.DATA.JSON.authFailure = 1;
SWS.DATA.JSON.notFound = 2;
SWS.DATA.JSON.internalErr = 3;
SWS.DATA.JSON.unKnownErr = 100;

SWS.DATA.OptionNotSupported = 0;
SWS.DATA.OptionInstalled = 1;
SWS.DATA.OptionNotInstalled = 2;

SWS.DATA.UIType2Line = 0x01;
SWS.DATA.UIType4Line = 0x02;
SWS.DATA.UIType4_3GUI = 0x04;
SWS.DATA.UIType7GUI = 0x08;

SWS.DATA.SWSAMPVCNT = 31;

SWS.DATA.DataArray = function(data){
	this.data = data;	
};

SWS.DATA.DataArray.prototype.GetText = function(value){ 
	for(var i=0; i<this.data.length; i++)
	{
		if( this.data[i][0] == value )
			return this.data[i][1];	
	}
	return "";
}

SWS.DATA.DataArray.prototype.GetData = function(){
	return this.data;
}

SWS.DATA.LoadLangList = function(){
	if(SWS.DATA.debugMode) {
		SWS.DATA.LangList = [["English", "en"],["Korean", "kr"],["Chinese", "zh"]];
	}else {
		SWS.DATA.LangList = [[" English ", "en"],[" Français ", "fr"],[" Deutsch ", "de"],[" Italiano ", "it"],[" Español ", "es"],[" Português ", "pt"],[" Polski ", "pl"],[" Русский ", "ru"],[" 简体中文 ", "zh"],[" 한국어 ", "ko"],[" Magyar ", "hu"],[" Türkçe ", "tr"],[" Português do Brasil ", "bp"]];
	}
}

SWS.DATA.LoadLangList();
