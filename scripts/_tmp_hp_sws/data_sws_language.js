Ext.namespace('SWS');
Ext.namespace('SWS.ERR');
Ext.namespace('LN');
Ext.namespace('LN.LANGDB');

LN.LANGDB.EnglishStrings = "";
LN.LANGDB.EnglishDB = [];
LN.LANGDB.SelectedDB = [];

LN.LANGDB.StartSeparator = "\x01\x02\x03\x04";
LN.LANGDB.EndSeparator = "\x06\x07\x08\x09";

LN.LANGDB.LoadLanguageFile = function(url) {
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

LN.LANGDB.LoadEnglishDB = function(debugMode){
	if(debugMode == false && SWS.DATA.defaultLanguage != "en") {
		var langStr = LN.LANGDB.LoadLanguageFile("data/sws_langEnglish.js");
		if(langStr != false) {
			LN.LANGDB.EnglishDB = langStr.split("\r\n");
			for(var i =0; i < LN.LANGDB.EnglishDB.length; i++) {
				LN.LANGDB.EnglishStrings += LN.LANGDB.StartSeparator + LN.LANGDB.EnglishDB[i] + LN.LANGDB.EndSeparator + "\r\n" + i +"\r\n";
			}
		}
	}
}

LN.LANGDB.LoadSelectedDB = function(debugMode){
	if(debugMode == false && SWS.DATA.defaultLanguage != "en") {
		var langStr = LN.LANGDB.LoadLanguageFile("data/sws_langTarget.js");
		if(langStr != false)
			LN.LANGDB.SelectedDB = langStr.split("\r\n");
	}
}

LN.LANGDB.LoadLanguageInfo= function(){
	if(SWS.DATA.debugMode) {
		LN.LANGDB.LangList = [["English", "en"],["Korean", "kr"],["Chinese", "zh"]];
	}else {
		LN.LANGDB.LangList = SWS.DATA.LangList;
	}


	LN.LANGDB.LoadEnglishDB(SWS.DATA.debugMode);
	LN.LANGDB.LoadSelectedDB(SWS.DATA.debugMode);
	
	if(LN.LANGDB.EnglishDB.length != LN.LANGDB.SelectedDB.length)
		alert("Language resource crashed...");
}

LN.LANGDB.LoadLanguageInfo();


_T = function(str)
{
	var tmp = "%";
	tmp += "%";

	if(typeof str != 'string')
	{
		alert("function _T has undefined input. Please Check your code");
		return "undefined";
	}
	
	if((str.length > 4) && (str.slice(0,2) == tmp) && (str.slice(str.length-2) == tmp))
		str = str.slice(2, str.length-2);

	if(SWS.DATA.defaultLanguage == "en" || LN.LANGDB.EnglishDB.length == 0 || LN.LANGDB.EnglishStrings.length == 0)
		return str;
	var searchStr = LN.LANGDB.StartSeparator + str + LN.LANGDB.EndSeparator + "\r\n";
	var searchIndx = LN.LANGDB.EnglishStrings.indexOf(searchStr, 0);
	if(searchIndx == -1)
		return str;
	var numString = LN.LANGDB.EnglishStrings.substr(searchIndx + searchStr.length, 7);
	var langIndx = parseInt(numString);
	
	if(typeof langIndx != 'number')
		return str;

	return LN.LANGDB.SelectedDB[langIndx];

}



SWS.ERR.JSPErrorNo = {
	NO_ERROR :
		{no: 0, msg: ""},
	INSUFFICIENT_MEMORY : 	
		{no: 1, msg: _T("%%Insufficient memory. Please try again when device is idle.%%")},
	BAD_VALUE : 	
	 	{no: 2, msg: _T("%%Bad parameters received. Please make sure your inputs are correct%%")},
	UNKNOWN : 	
	 	{no: 3, msg: _T("%%System internal errors occurred.%%")},
	OPERATION_FAIL : 	
	 	{no: 4, msg: _T("%%Your request failed. Please try again%%")},
	RCV_FAIL : 	
	 	{no: 5, msg: _T("%%Device cannot receive file or data%%")},
	DEVICE_BUSY : 	
	 	{no: 6, msg: _T("%%Device is busy. Please try again when device is idle.%%")},
	JOB_NOT_EXIST : 	
	 	{no: 7, msg: _T("%%The requested job was already removed%%")},	 
	WRONG_PAPER_SIZE :
		{no :8, msg: _T("%%Check Paper Size%%")},
	FILE_RCV_ERROR :
		{no :9, msg: _T("%%Cannot receive file%%")},
	INVALID_FIRMWARE :
		{no :10, msg: _T("%%Invalid Firmware%%")},
	WRONG_VERSION_FIRMWARE :
		{no :11, msg: _T("%%Firmware version is wrong.%%")},		
	EMPTY_FILE_ERROR :
		{no :12, msg: _T("%%The selected file is empty or does not exist.%%")},

	
	ABOOK_LINKED_INDI_DEL : 	
	 	{no: 101, msg: _T("%%Failed to delete individual address book because it is linked to group%%")},
	ABOOK_NOT_FOUND : 	
	 	{no: 102, msg: _T("%%The requested address book was not found%%")},
	ABOOK_NOT_LINKED : 	
	 	{no: 103, msg: _T("%%The requested address book cannot be linked to group because the related information is empty%%")},
	ABOOK_TOO_BIG_FILE : 	
	 	{no: 104, msg: _T("%%The imported file is too big%%")},
	ABOOK_INVALID_FILE : 	
	 	{no: 105, msg: _T("%%The imported file is not compatible with this model or version%%")},
	ABOOK_FAX_BUSY : 	
	 	{no: 106, msg: _T("%%This address cannot be edited or deleted because it is now used in fax job%%")},
	 	
	USERPROFILE_NOT_FOUND :
		{no: 201, msg: _T("%%The requested user was not found%%")},
	USERPROFILE_EXIST :
		{no: 202, msg: _T("%%Already Exist%%")},
	USERPROFILE_NO_EXIST :
		{no: 203, msg: _T("%%Cannot find the requested entry%%")},
	USERPROFILE_COUNT_FULL :
		{no: 204, msg: _T("%%Maximum count exceeded%%")},
	USERPROFILE_ROLE_REFERED :
		{no: 205, msg: _T("%%The requested role cannot be deleted because it is referred to user profile%%")},
	USERPROFILE_ACCT_REFERED :
		{no: 206, msg: _T("%%The requested standard accounting ID cannot be deleted because it is referred to user profile%%")},
	USERPROFILE_ACCT_NO_EXIST :
		{no: 207, msg: _T("%%Accounting ID was not found%%")},
	USERPROFILE_USER_BUSY :
		{no: 208, msg: _T("%%User is now logging%%")},
		
	BOX_PASSWD_NOT_MATCH :
		{no: 301, msg: _T("%%Password Not Matched.%%")},	
	BOX_NOT_SUPPORT_TASK :
		{no: 302, msg: _T("%%Your request for this document is not supported%%")},
	
	CERT_REFERENCED :
		{no: 401, msg: _T("%%The requested certificate is now used in applications%%")},
	IMAGE_NAME_DUPLICATED :
		{no: 402, msg: _T("%%Duplicate image name is not allowed.%%")},
	INVALID_FILE_FORMAT :
		{no: 403, msg: _T("%%Invalid file format.%%")},

	AUTH_REQUIRED : 	
	 	{no: 900, msg: _T("%%Permission Denied. You must send a proper authentication information to access this URL%%")},
	SECURE_FAX_NOT_MATCHED : 	
	 	{no: 901, msg: _T("%%Invalid Passcode%%")}
	
}

SWS.ERR.GetMsgByErrNo = function(errNo){
	
	var msg = '';
	
	for(var prop in SWS.ERR.JSPErrorNo){		
		if( SWS.ERR.JSPErrorNo[prop].no == errNo ){
			msg = SWS.ERR.JSPErrorNo[prop].msg;
			break;
		}
	}
	
	if(msg.length == 0 && errNo != 0)
		msg = _T("%%Unknown Error%%");
	return msg;
	
}

SWS.ERR.SERVER_TEST_ERRNO = {
	FAIL: 
		{no: -1, msg: _T("%%Fail%%")},
	PROCESSING:
		{no: 0, msg: _T("%%Processing%%")},
	SUCCESS:
		{no: 1, msg: _T("%%Success%%")},
	INVALID_INPUT:
		{no: 2, msg: _T("%%Invalid Input%%")},
	CONNECT_ERROR:
		{no: 3, msg: _T("%%Connection Error%%")},
	ACCOUNT_ERROR:
		{no: 4, msg: _T("%%Account Error%%")},
	SERVICE_DISABLE:
		{no: 5, msg: _T("%%Service Disabled%%")},
	ACCESS_DENIDED:
		{no: 6, msg: _T("%%Access Denied%%")},
	OPERATION_ERROR:
		{no: 7, msg: _T("%%Operation Error%%")},
	INVALID_SERVER:
		{no: 8, msg: _T("%%Invalid Server%%")},	
	INVALID_DOMAIN:
		{no: 9, msg: _T("%%Invalid Domain%%")},
	PATH_ERROR:
		{no: 10, msg: _T("%%Path Error%%")},
	DNS_ERROR:
		{no: 11, msg: _T("%%DNS Error%%")},
	SSL_SERVER_VALIDATION_ERROR:
		{no: 12, msg: _T("%%The server certificate is not trusted.%%")},
	UNKNOWN_ERROR:
		{no: 100, msg: _T("%%Unknown Error%%")}		
}

SWS.ERR.GetMsgBySrvTestErrNo = function(errNo){
	
	var msg = '';
	
	for(var prop in SWS.ERR.SERVER_TEST_ERRNO){		
		if( SWS.ERR.SERVER_TEST_ERRNO[prop].no == errNo ){
			msg = SWS.ERR.SERVER_TEST_ERRNO[prop].msg;
			break;
		}
	}
	if(msg.length == 0 && errNo != 0)
		msg = _T("%%Unknown Error%%");
	return msg;	
}


// Common
LN.PlzWait = _T("%%Please wait...%%");
LN.Wait = _T("%%Wait%%");
LN.Empty = _T("%%Empty%%");
LN.LIST = _T("%%LIST%%");
LN.Sitemap = _T("%%Site Map%%");
LN.SelectFile = _T("%%Select a file%%");
LN.Abort = _T("%%Abort%%"); 
LN.Valid = _T("%%Valid%%");
LN.Invalid = _T("%%Invalid%%");

// Value Validation
LN.ErrReported = _T("%%Some Errors were reported.%%");
LN.Error = _T("%%Error%%");
LN.ErrorMarked = _T("%%Please check field(s) marked by icon%%");
LN.Success = _T("%%Success%%");
LN.SuccessMsg = _T("%%Your Selections have been modified successfully.%%");
LN.SuccessRequestMsg = _T("%%Your requests have been registered successfully.%%");
LN.NoResponse = _T("%%No response%%");
LN.RetryMsg = _T("%%Please make sure device status and try again.%%");
LN.PageNotFound = _T("%%Page Not Found%%");
LN.URLNotFound = _T("%%The requested URL was not found on this server.%%");
LN.UnknownErrRcv = _T("%%Unknown error received from device%%");
LN.illegalSetErr = _T("%%This field does not allow {0}%%");
LN.ConfigurationError = _T("%%Configuration Error%%");

LN.FieldRequired = _T("%%This field is required%%");
LN.NumberRequired = _T("%%This field only allows numbers%%");
LN.NumberMinErr = _T("%%Number for this field should be more than or equal to {0}%%");
LN.NumberMaxErr = _T("%%Number for this field should be less than or equal to {0}%%");
LN.NumberLengthErr = _T("%%This field only allows {0} digits%%");
LN.PhoneErr = _T("%%This field should only contain numbers and special letters(#, *, -)%%");
LN.LengthMinErr = _T("%%This field should be more than or equal to {0} in length%%");
LN.LengthMaxErr = _T("%%This field should be less than or equal to {0} in length%%");
LN.LengthErr = _T("%%This field should be {0} in length%%");
LN.CntMaxErr = _T("%%Only maximum of {0} recipients are allowed.%%");
LN.FloatErr = _T("%%This field only allows floating numbers%%");

LN.IPv4FormatErr = _T("%%This field only allows IPv4 address. (For example, 192.0.2.1)%%");
LN.IPv4NumberErr = _T("%%Each field of IPv4 address should have the number from 0 to 255. (For example, 192.0.2.1)%%");
LN.IPv4MulticastErr = _T("%%This field only allows IPv4 multicast address%%");
LN.IPv4BroadcastErr = _T("%%This field only allows IPv4 broadcast address%%");
LN.IPv4UnicastRequied = _T("%%Please enter unicast IPv4 address%%");
LN.StaticIPv4MulticastErr = _T("%%This field does not allow IPv4 multicast address%%") + ". " + LN.IPv4UnicastRequied;
LN.StaticIPv4BroadcastErr = _T("%%This field does not allow IPv4 broadcast address%%") + ". " + LN.IPv4UnicastRequied;
LN.IPv4UnspecifiedErr = _T("%%This field does not allow unspecified IPv4 address(0.0.0.0)%%");
LN.StaticIPv4UnspecifiedErr = LN.IPv4UnspecifiedErr + ". " + LN.IPv4UnicastRequied;
LN.StaticIPv4InvalidErr = _T("%%This field does not allow invalid IPv4 address which starts or ends with 0%%") + ". " + LN.IPv4UnicastRequied;
LN.SubnetErr = _T("%%This field does not allow invalid subnet mask%%");
LN.SubnetLastOctetErr = _T("%%This field does not allow invalid subnet mask which last octet of subnet must not be 254 or 255%%");
LN.IPv6FormatErr = _T("%%This field only allows IPv6 address%%");

LN.HostNameLabelLenErr = _T("%%Host name should be 1 to 63 letters in length%%");
LN.HostNamehyphenErr = _T("%%Host name should not begin or end with a hyphen(-)%%");
LN.HostNameLabelErr = _T("%%Host name should only contain ASCII letters, digits, or hyphen%%");

LN.DomainNameLabelLenErr = _T("%%Each label should be 1 to 63 letters in length%%");
LN.DomainNamehyphenErr = _T("%%Domain name should not begin or end with a hyphen(-)%%");
LN.DomainNameLabelErr = _T("%%Only alphabet letters, number(0~9), periods(.) and hyphen(-) are permitted in the Domain Name field.%%");
LN.DomainNameLabelErrUnderscore = _T("%%Only alphabet letters, number(0~9), periods(.), underscore(_) and hyphen(-) are permitted in the Domain Name field.%%");
LN.DomainNameNumberErr = _T("%%Domain name cannot contain numbers only%%");

LN.EmailFormatErr = _T("%%This field should be an Email address in the format 'user@domain.com'%%");
LN.PrintableCharErr = _T("%%This field only allows ASCII printable characters%%");
LN.PrintableCharExceptionsErr = _T('%%This field does not allow <,\",>,\\%%');
LN.PATHCharExceptionsErr = _T('%%This field does not allow <,\",>%%');
LN.CharSetErr = _T("%%This field only allows characters%%");
LN.AlphaPrintableCharErr = _T("%%This field only allows Alphanumeric characters%%");
LN.HexadecimalErr = _T("%%This field only allows Hexadecimal characters%%");
LN.PathErr = _T("%%Path should not begin or end with a \\ or /%%");
LN.HTTPSErr = _T("%%This feature is served only over Secure HTTP(HTTPS)%%");

LN.Progressing = _T("%%Progressing%%");
LN.ConnectingToServer = _T("%%Connecting To Server%%");
LN.Registration = _T("%%Registration%%");
LN.Validation = _T("%%Validation%%");
LN.TryingToLogin = _T("%%Trying to Login%%");
LN.CheckingPermission = _T("%%Checking permission%%");
LN.AuthenticatingUser = _T("%%Authenticating user%%");
// HOME
LN.Home = _T("%%Home%%");
LN.ModelName = _T("%%Model Name%%");
LN.SerialNumber = _T("%%Serial Number%%");
LN.Administrator = _T("%%Administrator%%");
LN.DeviceInfo = _T("%%Device Information%%");
LN.TonerCart = _T("%%Toner Cartridge%%");
LN.Cartridge = _T("%%Cartridge%%");
LN.Remaining = _T("%%Remaining%%");
LN.ImagingUnit = _T("%%Imaging Unit%%");
LN.Unit = _T("%%Unit%%");
LN.MPTray = _T("%%MP Tray%%");
LN.ManualFeeder = _T("%%Manual Feeder%%");
LN.sheets = _T("%%sheet(s)%%");
LN.Capabilities = _T("%%Capabilities%%");
LN.Installation = _T("%%Installation%%");
LN.Logout = _T("%%Logout%%");
LN.Login = _T("%%Login%%");
LN.AutoLogout = _T("%%Auto Logout%%");

//Active Alert
LN.Alert = _T("%%Alert%%");
LN.NoAlert = _T("%%No Alert%%");
LN.ActiveAlerts = _T("%%Active Alerts%%");
LN.Other = _T("%%Other%%");
LN.Unknown = _T("%%Unknown%%");
LN.Untrained = _T("%%Untrained%%");
LN.Trained = _T("%%Trained%%");
LN.FieldService = _T("%%Field Service%%");
LN.Management = _T("%%Management%%");
LN.NotDefined = _T("%%Not Defined%%");
LN.noInterventionRequired = _T("%%No Intervention Required%%");

LN.Critical = _T("%%Critical%%");
LN.Warning = _T("%%Warning%%");

LN.Severity = _T("%%Severity%%");
LN.StatusCode = _T("%%Status Code%%");
LN.Description = _T("%%Description%%");
LN.SkillLevel = _T("%%Skill Level%%");
LN.Sysuptime = _T("%%System Up Time%%");
LN.days = _T("%%day(s)%%");
LN.Notice = _T("%%Notice%%");

// Billing Count
LN.MachineSerial = _T("%%Machine Serial Number%%");
LN.BillingInfo = _T("%%Billing Information%%");
LN.UsageCounters = _T("%%Usage Counters%%");
LN.TotalUsage = _T("%%Total Usage%%");
LN.LargePageUsage = _T("%%Large Page Usage%%"); 
LN.Counters = _T("%%Counters%%");
LN.Print=_T("%%Print%%");
LN.CountADFScanned=_T("%%Total DADF/ ADF Scanned%%");
LN.CountPlatenScanned=_T("%%Total Platen Scanned%%");
LN.CountEmbFaxSent=_T("%%Total Embedded Fax Sent%%");
LN.CountEmbFaxRcv=_T("%%Total Embedded Fax Received%%");
LN.Simplex=_T("%%Simplex%%");
LN.Mono=_T("%%Mono%%");
LN.Duplex=_T("%%Duplex%%");
LN.Color=_T("%%Color%%");
LN.TotalImp=_T("%%Total Impressions%%");

// supplies
LN.Supplies = _T("%%Supplies%%");
LN.PageCount = _T("%%Page Count%%");
LN.Capacity = _T("%%Capacity%%");
LN.MSG_READY = _T("%%Ready%%");
LN.Unidentified = _T("%%Unidentified%%");
LN.FeedRollerKit = _T("%%Feed Roller Kit%%");
LN.FeedRollerKitBypass = _T("%%Feed Roller Kit-Bypass Tray%%");
LN.RollerLife = _T("%%Roller Life%%");
LN.MPRollerLife = _T("%%MP Roller Life%%");
LN.TorqueLimiterLife = _T("%%Torque Limiter Life%%");
LN.RetardRollerLife = _T("%%Retard Roller Life%%");
LN.ForwardRollerLife = _T("%%Forward Roller Life%%");
LN.DustCleaningKitLife = _T("%%Dust Cleaning Kit Life%%");
LN.Life = _T("%%Life%%");
LN.Pages = _T("%%pages%%");
LN.Tray1 = _T("%%Tray 1%%");
LN.Tray2 = _T("%%Tray 2%%");
LN.Tray3 = _T("%%Tray 3%%");
LN.Tray4 = _T("%%Tray 4%%");
LN.Tray5 = _T("%%Tray 5%%");
LN.Impressions = _T("%%Impressions%%");
LN.ModelID = _T("%%Model ID%%");
LN.TonerCoverageCounter = _T("%%Toner Coverage Counter%%");
LN.CoveragePageCount_0_1 = _T("%%Coverage (0% ~ 1%) Page Count%%");
LN.CoveragePageCount_1_3 = _T("%%Coverage (1% ~ 3%) Page Count%%");
LN.CoveragePageCount_3_5 = _T("%%Coverage (3% ~ 5%) Page Count%%");
LN.CoveragePageCount_5_7 = _T("%%Coverage (5% ~ 7%) Page Count%%");
LN.CoveragePageCount_7_10 = _T("%%Coverage (7% ~ 10%) Page Count%%");
LN.CoveragePageCount_10_25 = _T("%%Coverage (10% ~ 25%) Page Count%%");
LN.CoveragePageCount_25_50 = _T("%%Coverage (25% ~ 50%) Page Count%%");
LN.CoveragePageCount_50_100 = _T("%%Coverage (50% ~ 100%) Page Count%%");
LN.Black=_T("%%Black%%");
LN.Cyan=_T("%%Cyan%%");
LN.Magenta=_T("%%Magenta%%");
LN.Yellow=_T("%%Yellow%%");

LN.Off = _T("%%Off%%");
LN.On = _T("%%On%%");
LN.Auto = _T("%%Auto%%");

LN.All = _T("%%All%%");
LN.Always = _T("%%Always%%");
LN.Never = _T("%%Never%%");
LN.Ok = LN.OK =  _T("%%OK%%");
LN.Apply = _T("%%Apply%%");
LN.Cancel = _T("%%Cancel%%");
LN.Undo = _T("%%Undo%%");
LN.Save = _T("%%Save%%");
LN.Add = _T("%%Add%%");
LN.Delete = _T("%%Delete%%");
LN.Edit = _T("%%Edit%%");
LN.Enable = _T("%%Enable%%");
LN.Disable = _T("%%Disable%%");
LN.Enabled = _T("%%Enabled%%");
LN.Disabled = _T("%%Disabled%%");

LN.Clear = _T("%%Clear%%");

//Current Settings
LN.CurrentSettings = _T("%%Current Settings%%");
LN.MachineInformation = _T("%%Machine Information%%");
LN.NetworkInformation = _T("%%Network Information%%");

// print config sheet
LN.PrintInfoSheet = _T("%%Print Information%%");

LN.Error = _T("%%Error%%");
LN.Warning = _T("%%Warning%%");

LN.General = _T("%%General%%");
LN.HostName = _T("%%Host Name%%");
LN.Location = _T("%%Location%%");
LN.Contact = _T("%%Contact%%");
LN.SpeedRate = _T("%%Speed Rate%%");

LN.PortNumber = _T("%%Port Number%%");
LN.Port = _T("%%Port%%");
LN.PrinterName = _T("%%Printer Name%%");
LN.PrinterURI = _T("%%Printer URI%%");
LN.JobCount = _T("%%Job Count%%");

LN.Name = _T("%%Name%%") ;

LN.mDNSDesc = _T("%%Multicast DNS (mDNS)%%");
LN.mDNSName = _T("%%mDNS Name%%");
LN.FriendlyName = _T("%%Friendly Name%%");

LN.AccessPermission = _T("%%Access Permission%%");

LN.IPAddr = _T("%%IP Address%%");
LN.IPv4Addr = _T("%%IPv4 Address%%");
LN.AutoIP = _T("%%Auto IP%%");
LN.ReceivedTrap = _T("%%Traps to be received%%");
LN.Emails = _T("%%Email Address(es)%%");
LN.Email = _T("%%Email Address%%");

// IPv6
LN.IPv6Protocol = _T("%%IPv6 Protocol%%");
LN.LinklocalAddr = _T("%%Link-Local Address%%");
LN.StatelessAddr = _T("%%Stateless Address%%");
LN.StatefulAddr = _T("%%Stateful Address%%");
LN.ManualAddr = _T("%%Manual Address%%");
LN.DefaultGateway = _T("%%Default Gateway%%");
LN.AddrAndPrefix = _T("%%Address%%") + " / " + _T("%%Prefix%%");
LN.NotAssigned = _T("%%Not Assigned%%");
LN.AddressType = _T("%%Address Type%%");
LN.AssignedBy = _T("%%Assigned By%%");
LN.SelfGeneration = _T("%%Self-generation%%");
LN.Router = _T("%%Router%%");
LN.UserConfig = _T("%%User Configuration%%");


LN.DHCPv6Router = _T("%%Use DHCP as directed by a router%%");
LN.DHCPv6Enable = _T("%%Always Enable DHCP%%");
LN.DHCPv6Disable = _T("%%Never use DHCP%%");
LN.DHCPv6Conf = _T("%%DHCPv6 Configuration%%");
LN.DHCPv6Desc = _T("%%Dynamic Host Configuration Protocol version 6 (DHCPv6)%%");
LN.IPv6DomainName = _T("%%IPv6 Domain Name%%");
LN.DNSv6Server1 = _T("%%Primary DNSv6 Server Address%%");
LN.DNSv6Server2 = _T("%%Secondary DNSv6 Server Address%%");
LN.DDNSv6 = _T("%%Dynamic DNSv6 Registration%%");
LN.DNSv6Desc = _T("%%Domain Name System version 6 (DNSv6)%%");

LN.Warning = _T("%%Warning%%");
LN.Critical = _T("%%Critical%%");
LN.Information = _T("%%Information%%");

LN.Page = _T("%%page(s)%%");
LN.OutputBinPage = _T("%%pages%%");
LN.RecName = _T("%%Recipient Name%%");

LN.ChangeErr = _T("%%Some errors occurred.%%");

LN.Total = _T("%%Total%%");
LN.Max = _T("%%Max%%");
LN.Configured = _T("%%Configured%%");

LN.ExpandAll = _T("%%Expand All%%");
LN.CollapseAll = _T("%%Collapse All%%");
LN.EmailNoti = _T("%%Email Notification%%");

LN.Consumables = _T("%%Consumables%%");
LN.SystemErrors = _T("%%System Errors%%");
LN.Others = _T("%%Others%%");

LN.DeviceStatus = _T("%%Device Status%%");
LN.Conditions = _T("%%Conditions%%");
LN.Setting = _T("%%Setting%%");
LN.Notification = _T("%%Notification%%");
LN.Severity = _T("%%Severity%%");
LN.Recipients = _T("%%Recipients%%");

LN.ShortageWarn = _T("%%Consumable Shortage Warning%%");
LN.Schedule = _T("%%Schedule%%");
LN.Time = _T("%%Time%%");

LN.times = _T("%%time(s)%%");
LN.hours = _T("%%hour(s)%%");
LN.TimeFormatHour = _T("%%hours%%");
LN.minute = _T("%%minute%%");
LN.minutes = _T("%%minutes%%");
LN.minute_s = _T("%%minute(s)%%");
LN.seconds = _T("%%second(s)%%");
LN.TimeoutSecond_s = _T("%%seconds%%");
LN.UserName = _T("%%User Name%%");
LN.Password = _T("%%Password%%");
LN.LoginID = _T("%%Login ID%%");
LN.ConfirmPassword = _T("%%Confirm Password%%");

LN.SystemAdmin = _T("%%System Administrator%%");
LN.PhoneNumber = _T("%%Phone Number%%");


LN.Letter = _T("%%Letter%%");

LN.NetworkSettings = _T("%%Network Settings%%");
LN.MACAddr = _T("%%MAC Address%%");
LN.MACFilter = _T("%%MAC Filter%%");
LN.MACFiltering = _T("%%MAC Filtering%%");
LN.ActualEthSpeed = _T("%%Actual Speed Rate%%");
LN.EthSpeed = _T("%%Ethernet Speed%%");

LN.Automatically = _T("%%Automatically%%");
LN.Manually = _T("%%Manually%%");

LN.AssignIP = _T("%%Assign IPv4 Address%%");

LN.IP9100Protocol = _T("%%Raw TCP/IP Printing Protocol%%");
LN.IP9100 = _T("%%Raw TCP/IP Printing%%");

LN.PortRange = "(1 ~ 65535)";
LN.LPDProtocol = _T("%%LPR/LPD Protocol%%");
LN.IPPProtocol =  _T("%%IPP Protocol%%");
LN.IPPDesc =  _T("%%Internet Printing Protocol (IPP)%%");

LN.NetPrinting =  "Raw TCP/IP, LPR, IPP";
LN.LPDDesc = _T("%%LPR/LPD%%");
LN.Multicast = _T("%%Multicast%%");
LN.Broadcast = _T("%%Broadcast%%");

LN.WSDProtocol = _T("%%WSD Protocol%%");

LN.TTLDesc = "(1~255) TTL";

LN.Hours= _T("%%hour(s)%%");

LN.Network = _T("%%Network%%");
LN.Protocols = _T("%%Protocols%%");
LN.SSDPProtocol = _T("%%SSDP Protocol%%");
LN.SSDPDesc = _T("%%Simple Service Discovery Protocol (SSDP)%%");
LN.UPNPDesc = _T("%%Universal Plug and Play (UPnP)%%");
LN.MDNSProtocol = _T("%%mDNS Protocol%%");
LN.SNMPDesc = _T("%%Simple Network Management Protocol (SNMP)%%");
LN.SNMPv2Protocol = _T("%%SNMPv1/v2 Protocol%%");
LN.Auto = _T("%%Auto%%");
LN.Ethernet = _T("%%Ethernet%%");
LN.HTTPProtocol = _T("%%HTTP Protocol%%");

LN.SLPDesc = _T("%%Service Location Protocol (SLP)%%");
LN.SLPProtocol = _T("%%SLP Protocol%%");
LN.MessageType = _T("%%Message Type%%");
LN.MulticastRadius = _T("%%Multicast Radius%%");
LN.RegistrationLifetime = _T("%%Registration Lifetime%%");
LN.MulticastAddr = _T("%%Multicast Address%%");

LN.RestoreDefault = _T("%%Restore Default%%");

LN.ETALKDesc = _T("%%EtherTalk%%");
LN.ETALKProtocol = _T("%%EtherTalk Protocol%%");
//System page
LN.System = _T("%%System%%");

//Setup page
LN.Settings = _T("%%Settings%%");
LN.MachineSettings = _T("%%Machine Settings%%");

LN.Setup = _T("%%Setup%%");
LN.TimeFormat = _T("%%Clock Mode%%");
LN.Date = _T("%%Date%%");
LN.DateTime = _T("%%Date & Time%%");
LN.DateTimeFormat = _T("%%(YYYY-MM-DD HH:MM)%%");
LN.Language = _T("%%Language%%");
LN.Emulation = _T("%%Emulation%%");
LN.PowerSave = _T("%%Power Save%%");
LN.TonerSave = _T("%%Toner Save%%");
LN.ImgUnitLowAlert = _T("%%Imaging Unit Low Alert%%");
LN.ImgUnitStop = _T("%%Imaging Unit Stop%%");
LN.ImgUnitStopAlert = _T("%%Turning off this option and continuing to print may damage the device\'s system.%%");
LN.LowPowerSave = _T("%%Low Power Save%%");
LN.ScanPowerSave = _T("%%Scan Power Save%%");
LN.MachineTimeOut = _T("%%Machine Timeout%%");
LN.Timeout = _T("%%Timeout%%");
LN.SystemTimeOut = _T("%%System Timeout%%");
LN.HeldJobTimeOut = _T("%%Held Job Timeout%%");
LN.HDDSpooling = _T("%%Mass Storage Device Spooling%%");
LN.AltitudeAdj = _T("%%Altitude Adjustment%%");
LN.AutoContinue = _T("%%Auto Continue%%");
LN.TonerLowAlert = _T("%%Toner Low Alert%%");
LN.TonerLowLevel = _T("%%Toner Low Level%%");
LN.AutoCR = _T("%%Auto CR%%");
LN.JobTimeOut = _T("%%Job Timeout%%");
LN.CleanFuser = _T("%%Clean Fuser%%");
LN.FuserCleaning = _T("%%Fuser Cleaning%%");
LN.Machine = _T("%%Machine%%");
LN.QuietMode = _T("%%Quiet Mode%%");

//Wakeup Event
LN.WakeupEvent = _T("%%Wakeup Event%%");
LN.ButtonPress = _T("%%Button Press%%");
LN.Scanner = _T("%%Scanner%%");

//Input Tray page
LN.Custom = _T("%%Custom%%");
LN.InputTrays = _T("%%Input Trays%%");
LN.InputTray = _T("%%Input Tray%%");
LN.Input = _T("%%Input%%");
LN.Tray = _T("%%Tray%%");
LN.Paper = _T("%%Paper%%");
LN.Size = _T("%%Size%%");
LN.Type = _T("%%Type%%");
LN.Source = _T("%%Source%%");
LN.CustomWidth = _T("%%Custom Width%%");
LN.CustomHeight = _T("%%Custom Height%%");
LN.CopyTray = _T("%%Copy Tray%%");
LN.FaxTray = _T("%%Fax Tray%%");
LN.TrayChaining = _T("%%Tray Chaining%%");
LN.MP = _T("%%Multi-Purpose(MP)%%");
LN.Copy = _T("%%Copy%%");
LN.Fax = _T("%%Fax%%");
LN.Chaining = _T("%%Chaining%%");
LN.PaperType = _T("%%Paper Type%%");
LN.PaperSize = _T("%%Paper Size%%");
LN.PaperSource = _T("%%Paper Source%%");
LN.FloatPointDeical =  _T("%%This field only allows number and up to {0} decimal places.%%");
LN.TrayPriority = _T("%%Tray Priority%%");
LN.TraySettings = _T("%%Tray Settings%%");
LN.TrayProtection = _T("%%Tray Protection%%");
LN.TrayConfimationMessage = _T("%%Tray Confirmation Message%%");

//OutBin
LN.Bin = _T("%%Bin%%");
LN.Bin1 = _T("%%Bin 1%%");
LN.Bin2 = _T("%%Bin 2%%");
LN.Bin3 = _T("%%Bin 3%%");
LN.Bin4 = _T("%%Bin 4%%");
LN.Bin5 = _T("%%Bin 5%%");
LN.Bin6 = _T("%%Bin 6%%");
LN.OutputBin = _T("%%Output Bin%%");
LN.LinkSetup = _T("%%Link Setup%%");
LN.DefaultSetup = _T("%%Default Setup%%");
LN.Link = _T("%%Link%%");
LN.UnLink = _T("%%Unlink%%");
LN.MailBox = _T("%%Mailbox%%");
LN.JobSeparator = _T("%%Job Separator%%");
LN.Collator = _T("%%Collator%%");
LN.Stacker = _T("%%Stacker%%");
LN.MultiBin = _T("%%Multi-Bin%%");
LN.MultiBinMode = _T("%%Multi-Bin Mode%%");
LN.StandardBin = _T("%%Standard Bin%%");
LN.InnerBin = _T("%%Inner Bin%%");
LN.FinishingBin = _T("%%Finishing Bin%%");
LN.TopBin = _T("%%Top Bin%%");

//Sound/Volume
LN.SoundVolume = _T("%%Sound/Volume%%");
LN.KeySound = _T("%%Key Sound%%");
LN.AlarmSound = _T("%%Alarm Sound%%");
LN.Speaker = _T("%%Speaker%%");
LN.Ringer = _T("%%Ringer%%");
LN.Sound = _T("%%Sound%%");

//Color
LN.ImageManagement = _T("%%Image Management%%");
LN.RunNow = _T("%%Run Now%%");
LN.RestoreDefaultNow = _T("%%Restore Default Now%%");
LN.AutoColorRegistration = _T("%%Auto Color Registration%%");
LN.CustomColor = _T("%%Custom Color%%");
LN.Color = _T("%%Color%%");
LN.Black = _T("%%Black%%");
LN.Cyan = _T("%%Cyan%%");
LN.Magenta = _T("%%Magenta%%");
LN.Yellow = _T("%%Yellow%%");

LN.Printer = _T("%%Printer%%");

//Graphic
LN.Graphic = _T("%%Graphic%%");
LN.FineEdge = _T("%%Fine Edge%%");
LN.EdgeEnhance = _T("%%Edge Enhance%%");
LN.Trapping = _T("%%Trapping%%");
LN.DarkenText = _T("%%Darken Text%%");
LN.ClearText = _T("%%Clear Text%%");
LN.Resolution = _T("%%Resolution%%");
LN.Screen = _T("%%Screen%%");

//Postscript
LN.PostScript = _T("%%PostScript%%");
LN.PostScriptErr = _T("%%PostScript Error%%");

//Copy
LN.Copy = _T("%%Copy%%");
LN.ChangeDefault = _T("%%Change Default%%");
LN.Reduce = _T("%%Reduce/Enlarge%%");
LN.CustomReduce = _T("%%Custom Reduce/Enlarge%%");
LN.Darkness = _T("%%Darkness%%");
LN.Contrast = _T("%%Contrast%%");
LN.OriginalType = _T("%%Original Type%%");

LN.SavePasswd = _T("%%Change Password%%");
LN.SMTPLoginInfor = _T("%%SMTP Login Information%%");
LN.POP3Server = _T("%%POP3 Server%%");
LN.POP3Auth = _T("%%POP3 Authentication%%");
LN.SMTPServer = _T("%%SMTP Server%%");
LN.SMTPDesc = _T("%%Simple Mail Transfer Protocol (SMTP)%%");
LN.SMTPAuth =  _T("%%SMTP Requires Authentication%%");
LN.OutgoingMail = _T("%%Outgoing Mail Server (SMTP)%%");
LN.S2ERunning = _T("%%Another email job is running.%%");
LN.TestRunning = _T("%%Another test is progressing.%%");

LN.Advanced = _T("%%Advanced%%");
LN.Status = _T("%%Status%%");
LN.OutputBinding = _T("%%Output Binding%%");
LN.OriginalBinding = _T("%%Original Binding%%");	

//SNMPv3
LN.SNMPv3Desc = _T("%%Simple Network Management Protocol version 3 (SNMPv3)%%");
LN.SNMPv3Protocol = _T("%%SNMPv3 Protocol%%");
LN.CommunityName = _T("%%Community Name%%");
LN.SNMPCommunityName = _T("%%Community Name%%");
LN.SNMPCommunity = _T("%%SNMP Community%%");
LN.WriteAccess = _T("%%Write Access%%");
LN.Cold = _T("%%Cold%%");
LN.Warm = _T("%%Warm%%");
LN.AuthFailure = _T("%%Authentication Failure%%");
LN.ReadOnly = _T("%%Read only%%");
LN.WriteOnly = _T("%%Write only%%");
LN.ReadAndWrite = _T("%%Read and Write%%");
LN.NoPermission = _T("%%No permission%%");
LN.AuthPassword = _T("%%Authentication Password%%");
LN.AuthAlgorithm = _T("%%Authentication Algorithm%%");
LN.Auth = _T("%%Authentication%%");
LN.PrivacyPassword = _T("%%Privacy Password%%");
LN.PrivacyAlgorithm = _T("%%Privacy Algorithm%%");
LN.Privacy = _T("%%Privacy%%");
LN.SNMPTraps = _T("%%SNMP Traps%%");
LN.Traps = _T("%%Traps%%");
LN.TrapCommunityName = _T("%%Trap Community Name%%");
LN.AllTraps = _T("%%All Traps%%");
LN.NoTrap = _T("%%No trap%%");
LN.TrapDestination = _T("%%Trap Destination%%");



// Kerberos
LN.KerberosServer = _T("%%Kerberos Server%%");
LN.Realm = _T("%%Realm%%");
LN.ServerAddress = _T("%%Server Address%%");
LN.ServerPort = _T("%%Server Port%%");
LN.BackupServer = _T("%%Backup Server%%");
LN.BackupPort = _T("%%Backup Port%%");
LN.ServerType = _T("%%Server Type%%");
LN.ServerUnix = _T("%%Unix, Linux%%");
LN.ServerWindows = _T("%%Windows ADS%%");
LN.RequiredInfo = _T("%%Required Information%%");
LN.AdditionalInfo = _T("%%Additional Information%%");
LN.BackupPortWarn = _T("%%Port number is required to configure Backup Server.%%");
LN.NotConfigured = _T("%%Not Configured%%");

//telnet
LN.TelnetProtocol = _T("%%Telnet Protocol%%");

// SMB
LN.Domain = _T("%%Domain%%");
LN.Server = _T("%%Server%%");
// Common
LN.InputError = _T("%%Input Error%%");
LN.MakeSureInput = _T("%%Make sure your input is correct.%%");
LN.DeleteItem = _T("%%Do you really want to delete the selected item(s)?%%");

// LDAP
LN.LDAPServer = _T("%%LDAP Server%%");
LN.Anonymous = _T("%%Anonymous%%");
LN.Simple = _T("%%Simple%%");

//Fax General 
LN.MachineIdAndFax = _T("%%Machine ID & Fax Number%%");
LN.MachineId = _T("%%Machine ID%%");
LN.FaxNumber = _T("%%Fax Number%%");	
LN.Sending = _T("%%Sending%%");
LN.Receiving = _T("%%Receiving%%");
LN.SecureRcv = _T("%%Secure Receive%%");
LN.WholeDay = _T("%%Whole Day%%");
LN.SecureFaxBtn = _T("%%Print fax in secure receive mode%%");
LN.RedialTimes = _T("%%Redial Times%%");
LN.RedialTerm = _T("%%Redial Term%%");
LN.PrefixDial = _T("%%Prefix Dial%%");
LN.ErrCorrectionMode = _T("%%ECM Mode%%");
LN.ReceiveMode = _T("%%Receive Mode%%");
LN.RingToAns = _T("%%Ring to Answer%%");	
LN.AutoReduction = _T("%%Auto Reduction%%");
LN.DiscardSize = _T("%%Discard Size%%");
LN.FaxDuplex = _T("%%Duplex Print%%");	
LN.RcvStartCode = _T("%%Receive Start Code%%");
LN.Print = _T("%%Print%%");
LN.TollSave = _T("%%Toll Save%%");
LN.Passcode = _T("%%Passcode%%");
LN.ConfirmPasscode = _T("%%Confirm Passcode%%");
LN.AutoReport = _T("%%Auto Report%%");
LN.OutputTray = _T("%%Output Tray%%");
LN.StandardBin = _T("%%Standard Bin%%");
LN.TopBin = _T("%%Top Bin%%");
LN.FinishingBin = _T("%%Finishing Bin%%");
LN.InnerBin = _T("%%Inner Bin%%");
LN.Staple = _T("%%Staple%%");
LN.Staple1 = "1" + " " + _T("%%Staple%%");

//Fax Forward
LN.FaxForwarding = _T("%%Fax Forwarding%%");
LN.ForwardType = _T("%%ForwardType%%");
LN.FaxForwardToEmail = _T("%%Fax Forward to Email%%");
LN.FaxForwardTo = _T("%%Fax Forward to%%");
LN.FaxForward = _T("%%Fax Forward%%");
LN.FaxForwardSetting = _T("%%Fax Forward Setting%%");
LN.PrintConfirmationSheet = _T("%%Print Confirmation Sheet%%");
LN.ChangeDefault = _T("%%Change Default%%");
LN.DefaultImageFormat = _T("%%Default Image Format%%");
LN.PrintLocalCopy = _T("%%Forward & Print%%");
LN.DefaultAttachmentType = _T("%%Default Attachment Type%%");
LN.AttachmentFormat = _T("%%Attachment Format%%");
LN.RecipientAddress = _T("%%Recipient Address(es)%%");
LN.RecipientAddressDesc = _T("%%Note : Enter multiple recipient addresses separated by comma(,) or new line.%%");
LN.LoadABook = _T("%%Load Address Book%%");
LN.LoadingABook = _T("%%Loading Address Book.%%");
LN.Index = _T("%%Index%%");
LN.Alias = _T("%%Alias%%");
LN.Protocol = _T("%%Protocol%%");
LN.AliasForTheSetup = _T("%%Alias for the Setup%%");
LN.EmailABook = _T("%%Email Address Book%%");
LN.FaxABook = _T("%%Fax Address Book%%");
LN.SMBABook = _T("%%SMB Address Book%%");
LN.FTPABook = _T("%%FTP Address Book%%");
LN.PC = _T("%%PC%%");
LN.SendForward = _T("%%Send Forward%%");
LN.RecvForward = _T("%%Receive Forward%%");
LN.ForwardList = _T("%%Forward List%%");
LN.FaxForwardToFax = _T("%%Fax Forward to Fax%%");
LN.FilingPolicy = _T("%%Filing Policy%%");
LN.FileName = _T("%%File Name%%");
LN.Fax = _T("%%Fax%%");
LN.StartDateTime = _T("%%Start Date & Time%%");
LN.EndDateTime = _T("%%End Date & Time%%");

//Received Fax Printing
LN.ReceivedFaxPrinting = _T("%%Received Fax Printing%%");
LN.StampReceiveName = _T("%%Stamp Received Name%%");

//FAX Report
LN.FaxReport = _T("%%Fax Report%%");
LN.FaxSendReport = _T("%%Fax Send Report%%");
LN.FaxConfirm = _T("%%Fax Confirmation%%");
LN.FaxSendFwdConfirm = _T("%%Send Forward Confirmation%%");	
LN.FaxRecvFwdConfirm = _T("%%Receive Forward Confirmation%%");	
LN.FaxSentReport = _T("%%Fax Sent%%");	
LN.FaxReceivedReport = _T("%%Fax Received%%");	


//Scan 
LN.Scan = _T("%%Scan%%");
LN.DPI = _T("%%dpi%%");
LN.DefOrigianlType = _T("%%Original Type%%");
LN.DefScanResolution = _T("%%Resolution%%");
LN.ColorMode = 
LN.DefScanColor = _T("%%Color Mode%%");
LN.DefImageFormat = _T("%%File Format%%");
LN.DefDarkness = _T("%%Darkness%%");
LN.DefContrast = _T("%%Contrast%%");

LN.ScanToServer = _T("%%Scan to Server (FTP/SMB)%%");
LN.ScanToFTP = _T("%%Scan to FTP%%");
LN.ScanToSMB = _T("%%Scan to SMB%%");
LN.FTPProtocol = _T("%%FTP Protocol%%");
LN.SMBProtocol = _T("%%SMB Protocol%%");
LN.SrvConnectionTimeout = _T("%%Server Connection Timeout%%");
LN.PrintConfirmSheet = _T("%%Print Confirmation Sheet%%");
LN.PCScanSecurity= _T("%%PC Scan Security%%");
LN.ScanSecurity= _T("%%Scan Security%%");
LN.SecurePCSCAN= _T("%%PC Scan Security%%");
LN.SecureFAX2PC= _T("%%Fax to PC Security%%");
LN.SecurePCFAX= _T("%%PC FAX Security%%");
LN.PCAppSec=_T("%%PC Application Security%%");

LN.ScanToEmail = _T("%%Scan to Email%%");
LN.DefFormAddr = _T("%%Default [From:] Address%%");
LN.DefaultSubject = _T("%%Default Subject%%");
LN.DefaultMessage = _T("%%Default Message%%");
LN.HowToUseFrom = _T("%%Edit [From:] Address%%");
LN.NeverChangeS2E = _T("%%Never change [From:] address%%");
LN.AllowUserToChangeS2E = _T("%%Allow user to change [From:] Address%%");
LN.ReplaceAddressS2E = _T("%%Replace default [From:] address with Email address of the authenticated user if possible%%");
LN.ReplaceAddressFieldS2E = _T("%%Replace [From:] address%%");
LN.S2ETextAttach = _T( "%%Email Text Attachment%%");
LN.AutoSendToSelf = _T("%%Auto Send to Self%%");
LN.AutoAddSenders = _T("%%Automatically add the senders [From:] address to the recipient list%%");
LN.EnableDefMailText = _T("%%Use default message on Scan to Email%%"); 
LN.AdminLogin = _T("%%Login%%");
LN.Id = _T("%%ID%%");
//Layout
LN.Layout = _T("%%Layout%%");
LN.Orientation = _T("%%Orientation%%");
LN.Duplex = _T("%%Duplex%%");
LN.DuplexTopMargin = _T("%%Duplex Top Margin%%");
LN.DuplexLeftMargin = _T("%%Duplex Left Margin%%");
LN.ShortEdgeBinding = _T("%%Short Edge Binding%%");		
LN.LongEdgeBinding = _T("%%Long Edge Binding%%");
LN.SimplexTopMargin = _T("%%Simplex Top Margin%%");	
LN.SimplexLeftMargin = _T("%%Simplex Left Margin%%");
LN.Copies = _T("%%Copies%%");	

// Contact
LN.NotConfigured = _T("%%Not Configured%%");
//IPP ADV
LN.PrinterInfo = _T("%%Printer Information%%");
LN.MorePrintInfo = _T("%%More Printer Information%%");
LN.PrinterLocation = _T("%%Printer Location%%");
LN.IPPAttr = _T("%%IPP Attribute%%");
LN.IPPSecurity = _T("%%IPP Security%%");
LN.AuthType = _T("%%Authentication Type%%");
LN.Digest = _T("%%Digest%%");
LN.Basic = _T("%%Basic%%");
LN.None = _T("%%None%%");
LN.OperMsg = _T("%%Operation Message%%");
LN.DriverInstaller = _T("%%Driver Installer%%");
LN.Manufacturer = _T("%%Manufacturer%%");

// ABOOK

LN.Individual = _T("%%Individual%%");
LN.IndividualAddrBook = _T("%%Individual Address Book%%");
LN.Group = _T("%%Group%%");
LN.Groups = _T("%%Groups%%");
LN.AddGroup = _T("%%Add Group%%");
LN.EditGroup = _T("%%Edit Group%%");
LN.DeleteGroup = _T("%%Delete Group%%");
LN.FaxGroups = _T("%%Fax Groups%%");
LN.FaxGroupsAddrBook = _T("%%Fax Groups Address Book%%");
LN.EmailGroups = _T("%%Email Groups%%");
LN.EmailGroupsAddrBook = _T("%%Email Groups Address Book%%");
LN.SMBGroups = _T("%%SMB Groups%%");
LN.SMBGroupsAddrBook = _T("%%SMB Groups Address Book%%");
LN.FTPGroups = _T("%%FTP Groups%%");
LN.FTPGroupsAddrBook = _T("%%FTP Groups Address Book%%");
LN.AddressBook = _T("%%Address Book%%");
LN.SelectOneForDetails = _T("%%If you want detail information, please select one.%%");
LN.Favorite = _T("%%Favorite%%");

LN.SMBServer = _T("%%SMB Server%%");
LN.SMBServerPort = _T("%%SMB Server Port%%");
LN.SMBServerAddr = _T("%%SMB Server Address%%");
LN.FTPServer = _T("%%FTP Server%%");
LN.FTPServerPort = _T("%%FTP Server Port%%");
LN.FTPServerAddr = _T("%%FTP Server Address%%");
LN.LoginName = _T("%%Login Name%%");
LN.email = _T("%%Email%%");
LN.Path = _T("%%Path%%");
LN.Domain = _T("%%Domain%%");
LN.Total = _T("%%Total%%");
LN.Configured = _T("%%Configured%%");
LN.Name = _T("%%Name%%");
LN.SpeedNo = _T("%%Speed No.%%");
LN.Address = _T("%%Address%%");
LN.NoOfMembers = _T("%%No. of Members%%");
LN.GroupName = _T("%%Group Name%%");
LN.GroupType = _T("%%Group Type%%");
LN.Yes = _T("%%Yes%%");
LN.No = _T("%%No%%");
LN.AfterGroupCreated = _T("%%Add individual(s) after this group is created%%");
LN.AddGroups = _T("%%Add Group%%");
LN.YouShouldAddMemberInG = _T("%%You should add members in Group%%");
LN.Import = _T("%%Import%%");
LN.Export = _T("%%Export%%");
LN.MustSelectAtleastOne = _T("%%Please fill out at least 1 out of 4 options (Email, Fax, SMB, FTP )%%");
LN.Task = _T("%%Task%%");

// TCPIP
LN.Manually = _T("%%Manually%%");
LN.Automatically = _T("%%Automatically%%");

LN.SubnetMask = _T("%%Subnet Mask%%");
LN.Gateway = _T("%%Gateway Address%%");
LN.DomainName = _T("%%Domain Name%%");
LN.PrimaryDNS = _T("%%Primary DNS Server%%");
LN.SecondaryDNS = _T("%%Secondary DNS Server%%");
LN.DDNS = _T("%%Dynamic DNS Registration%%");
LN.WINSDesc = _T("%%Windows Internet Name Service (WINS)%%");
LN.WINSPrimary = _T("%%Primary WINS Server%%");
LN.WINSSecondary = _T("%%Secondary WINS Server%%");
LN.WINSProtocol = _T("%%WINS Protocol%%");
LN.NetworkProtocols = _T("%%Network Protocols%%");
LN.GatewayErr = _T("%%Invalid Gateway.%%");

//Port Control
LN.T4NET = _T("%%T4NET Protocol%%");
LN.SETIP = _T("%%SETIP Protocol%%");
LN.LTP = _T("%%LTP Protocol%%");
LN.ACS = _T("%%ACS Protocol%%");
LN.PC2FAXPROTOCOL = _T("%%PC2FAX Protocol%%");
LN.Ethernet = _T("%%Ethernet%%");
LN.HTTPProtocol = _T("%%HTTP Protocol%%");
LN.SMTP = _T("%%SMTP%%") + " " + LN.Protocol;
LN.DHCPv6 = _T("%%DHCPv6%%");
LN.FAX2PC = "FAX2PC";
LN.FAX2PCPortCtrlAlertMsg = _T("%%Disabling FAX2PC protocol will take effect after system is rebooted.%%");
LN.DHCPV6PortCtrlAlertMsg = _T("%%Disabling DHCPv6 protocol will take effect after system is rebooted.%%");
LN.EthernetPortCtrlAlertMsg = _T("%%Enabling or Disabling Ethernet will take effect after system is rebooted.%%");
LN.HTTPPortCtrlAlertMsg = _T("%%Disabling HTTP protocol will take effect after system is rebooted.%%");
LN.SMTPPortCtrlAlertMsg = _T("%%Disabling SMTP protocol will take effect after system is rebooted.%%");
LN.LTPPortCtrlAlertMsg = _T("%%Disabling LTP protocol will take effect after system is rebooted.%%");
LN.SLPPortCtrlAlertMsg = _T("%%Disabling SLP protocol will take effect after system is rebooted.%%");
LN.SSDPPortCtrlAlertMsg = _T("%%Disabling SSDP protocol will take effect after system is rebooted.%%");
LN.WINSPortCtrlAlertMsg = _T("%%Enabling WINS protocol will take effect after system is rebooted.%%");
LN.IPv6PortCtrlAlertMsg =_T("%%Enabling or Disabling IPv6 protocol will take effect after system is rebooted.%%")
	
//Proxy
LN.ProxySettings = _T("%%Proxy Settings%%");
LN.UseProxy = _T("%%Use Proxy%%");
LN.ProxySrvAdd = _T("%%HTTP Proxy Server Address%%");
LN.ProxySrvPort = _T("%%HTTP Proxy Server Port Number%%");
LN.ProxyAuthSettings = _T("%%Proxy Authentication Settings%%");
LN.ProxyAuth = _T("%%Proxy Authentication%%");
LN.ProxySettings = _T("%%Proxy Settings%%");

//LOG VIEWER
LN.SystemLog = _T("%%System Log%%");
LN.User = _T("%%User%%");
LN.Result = _T("%%Result%%");
LN.Category = _T("%%Category%%");
LN.LogViewer = _T("%%Log Viewer%%");
LN.JobStatus = _T("%%Job Status%%");
LN.JobName = _T("%%Job Name%%");
LN.UserName = _T("%%User Name%%");
LN.Impression = _T("%%Impression%%");
LN.StartTime = _T("%%Start Time%%");
LN.EndTime = _T("%%End Time%%");
LN.CustomSearch = _T("%%Custom Search%%");
LN.Search = _T("%%Search%%");
LN.JobLog = _T("%%Job Log%%");
LN.OperationLog = _T("%%Operation Log%%");
LN.SecurityEventLog = _T("%%Security Event Log%%");
LN.DocumentBoxLog = _T("%%Document Box Log%%");
LN.Destination =_T("%%Destination%%");

//LOG Configuration
LN.LogConfiguration = _T("%%Log Configuration%%");
LN.HidingRestrictionOpt = _T("%%Hiding restriction option%%");
LN.ShowAllInfo = _T("%%Show All Information%%");
LN.ShowNonSecureInfo = _T("%%Show Non-Secure information only%%");
LN.ShowOwnerInfo = _T("%%Show user's own information only%%");
LN.AllAsterisks = _T("%%Asterisks as many as characters of information%%");
LN.FirstAndFixedAsterisks = _T("%%Asterisks as many as fixed count except first char%%");
LN.FixedAsterisks = _T("%%Asterisks as many as fixed counts%%");
LN.HidingObscureOpt = _T("%%Hiding obscure option%%");

// restart
LN.RestartDevice = _T("%%Restart Device%%");

// erase all
LN.EraseAll = _T("%%Erase All%%");

//JOBS
LN.Jobs = _T("%%Jobs%%");
LN.Refresh = _T("%%Refresh%%");
LN.JobType = _T("%%Job Type%%");

//User Profile
LN.UserProfile = _T("%%User Profile%%");
LN.AccountingId = _T("%%Accounting ID%%");
LN.NoAccounting = _T("%%No Accounting%%");
LN.NetworkAccounting = _T("%%Network Accounting%%");

LN.RoleName = _T("%%Role Name%%");
LN.DocumentBox = _T("%%Document Box%%");
LN.ScanToUSB = _T("%%Scan to USB%%");
LN.ScanToSrv = _T("%%Scan to Server%%");
LN.ScanToPc = _T("%%Scan to PC%%");
LN.StoredDocument = _T("%%Stored Document%%");
LN.UnlockedFeatures = _T("%%Unlocked Features%%");
LN.LockedVisibleFeatures = _T("%%Locked Visible Features%%");
LN.UnlockedRoles = _T("%%Unlocked Roles%%");
LN.LockedVisibleRoles = _T("%%Locked Visible Roles%%");
LN.Roles = _T("%%Role(s)%%");
LN.Select = _T("%%Select%%");
LN.BuiltInRoleAdmin = _T("%%Built-in role for administrator%%");
LN.BuiltInGuest = _T("%%Built-in role for guest%%");
LN.UserCreatedRole = _T("%%User created role%%");
LN.FeaturesAvailable = _T("%%feature(s) available%%");
LN.UserId = _T("%%User ID%%");
LN.Features = _T("%%Features%%");


//User Profile
LN.InActived = _T("%%Inactivated%%");
LN.Actived = _T("%%Activated%%");
LN.CreatedRoleCnt = _T("%%{0} Role(s) Defined%%");
LN.CreatedProfileCnt = _T("%%{0} User Profile(s) Defined%%");
LN.Authority = _T("%%Authority%%");
LN.Unlocked = _T("%%Unlocked%%");
LN.LockedVisible = _T("%%Locked Visible%%");
LN.LockedHidden = _T("%%Locked Hidden%%");
LN.RoleConfiguration = _T("%%Role Configuration%%");
LN.Services = _T("%%Service(s)%%");
LN.UsedIn = _T("%%Used In%%");

//Standard Accounting
LN.StandardAcntUser = _T("%%Standard Accounting List%%");
LN.StandardAccounting = _T("%%Standard Accounting%%");
LN.Selection = _T("%%Selection%%");
LN.Limitation = _T("%%Limitation%%");
LN.ColorCopy = _T("%%Color Copy%%");
LN.MonoCopy = _T("%%Mono Copy%%");
LN.ColorPrinting = _T("%%Color Printing%%");
LN.MonoPrinting = _T("%%Mono Printing%%");
LN.USBDirectPrinting = _T("%%USB Direct Printing%%");
LN.DontCloseDialog = _T("%%Don't close this dialog after applying%%");
LN.Details = _T("%%Details%%");
LN.NoAuth = _T("%%No Authentication%%");
LN.AuthMethod = _T("%%Authentication Method%%");
LN.LocalAuth = _T("%%Local Authentication%%");
LN.SSO = _T("%%Single Sign On (SSO)%%");
LN.Acnt = _T("%%Accounting%%");
LN.AcntMethod = _T("%%Accounting Methods%%");
LN.Selected = _T("%%Selected%%");


// Cert
LN.CreatingSelfCert = _T("%%Creating a Self-signed Certificate%%");
LN.CreateSelfCert = _T("%%Create a Self-signed Certificate%%");
LN.CountryCode = _T("%%Country Code%%");
LN.CertCC = _T("%%2 Letter Country Code%%");	
LN.CertState = _T("%%State/Province Name%%");
LN.CertLocality = _T("%%Locality Name%%");
LN.CertON = _T("%%Organization Name%%");
LN.CertOU = _T("%%Organization Unit%%");
LN.CertCN = _T("%%Common Name%%");
LN.CertValidPeriod = _T("%%Valid Period(days)%%");
LN.SelfCert = _T("%%Self-signed Certificate%%");
LN.IssuedDate = _T("%%Issued Date%%");
LN.ExpireDate = _T("%%Expire Date%%");
LN.CertInfo = _T("%%Certificate Information%%");
LN.RootCert = _T("%%Root Certificate%%");
LN.ValidDate = _T("%%Valid Date%%");
LN.FriendlyName = _T("%%Friendly Name%%");

// Secure Connection
LN.SecureConnection = _T("%%Secure Connection%%");
LN.HTTPSONLY = _T("%%HTTPS Only%%");
LN.HTTP_HTTPS = _T("%%Both HTTP and HTTPS%%");

// admin
LN.LoginFailurePolicy = _T("%%If user fail to login {0} times within {0} minutes, this web interface will not allow the user to login for {0} minutes.%%");
LN.PassDefaultSetting = _T("%%Currently, Web Interface ID and password are set to default. Please change your ID and password.%%");


//Feature Enablement
LN.FeatureManagement = _T("%%Feature Management%%");
LN.PhysicalPorts = _T("%%Physical Ports%%");
LN.USBPort = _T("%%USB Port%%");
LN.USBHost = _T("%%USB Host%%");
LN.NetworkScan = _T("%%Network Scan%%");
LN.HTTPPortCtrlAlertMsg = _T("%%Disabling HTTP protocol will take effect after system is rebooted.%%");
LN.SLPPortCtrlAlertMsg = _T("%%Disabling SLP protocol will take effect after system is rebooted.%%");
LN.mDNSPortCtrlAlertMsg = _T("%%Disabling mDNS protocol will take effect after system is rebooted.%%");
LN.WINSPortCtrlAlertMsg = _T("%%Enabling WINS protocol will take effect after system is rebooted.%%");
LN.EthernetPortCtrlAlertMsg = _T("%%Enabling or Disabling Ethernet will take effect after system is rebooted.%%");
//Print Information Sheet
LN.Report = _T("%%Report%%");


//Box
LN.BoxName = _T("%%Box Name%%");
LN.Owner = _T("%%Owner%%");
LN.NewPassword = _T("%%New Password%%");
LN.ChangePassword = _T("%%Change Password%%");
LN.SecuredBox = _T("%%Secured Box%%");
LN.Box = _T("%%Box%%");
LN.DocumentFormat = _T("%%Document Format%%");
LN.CommonBox = _T("%%Common Box%%");
LN.PublicBox = _T("%%Public Box%%");
LN.SecureBox = _T("%%Secure Box%%");	
LN.UserBox = _T("%%User Box%%");
LN.SystemBox = _T("%%System Box%%");
LN.PrintReport = _T("%%Print Report%%");
LN.Preview = _T("%%Preview%%");
LN.Thumbnail = _T("%%Thumbnail%%");
LN.DocumentName = _T("%%Document Name%%");
LN.Boxes = _T("%%Box(es)%%");
LN.Merged = _T("%%Merged%%");
LN.UnknownType = _T("%%Unknown Type%%");
LN.FileFormat = _T("%%File Format%%");
LN.SinglePageTIFF = _T("%%Single-Page TIFF%%");
LN.MultiPageTIFF = _T("%%Multi-Page TIFF%%");
LN.Option = _T("%%Option%%");
LN.SendToEmail = _T("%%Send to Email%%");
LN.SendToFax = _T("%%Send to Fax%%");
LN.SendToFTPSMB = _T("%%Send to FTP/SMB%%");
LN.DownloadToPC = _T("%%Download to PC%%");
LN.To = _T("%%To%%");
LN.From = _T("%%From%%");
LN.CC = _T("%%Cc%%");
LN.BCC = _T("%%Bcc%%");
LN.Subject = _T("%%Subject%%");
LN.Message = _T("%%Message%%");
LN.LongEdge = _T("%%Long Edge%%");
LN.ShortEdge = _T("%%Short Edge%%");
LN.ColorMode = _T("%%Color Mode%%");

LN.Mono = _T("%%Mono%%");
LN.PrintOptions = _T("%%Print Options%%");
LN.Fail = _T("%%Fail%%");

LN.Ready = _T("%%Ready%%");
LN.Full = _T("%%Full%%");
LN.File = _T("%%File%%");

//Direct print
LN.Portrait = _T("%%Portrait%%");
LN.Landscape = _T("%%Landscape%%");
LN.DirectPrint = _T("%%Direct Print%%");

//Firmware Upgrade
LN.FirmwareUpgrade = _T("%%Firmware Upgrade%%");
LN.Firmware = _T("%%Firmware%%");
LN.Version = _T("%%Version%%");
LN.NewVersion = _T("%%New Version%%");
LN.CurVersion = _T("%%Current Version%%");
LN.NotInstalled = _T("%%Not Installed%%");
LN.Installed = _T("%%Installed%%");
LN.PlzSelectFile = _T("%%Please select a file%%");

LN.LicenseManagement = _T("%%License Management%%");

//link
LN.Download = _T("%%Download%%");

//admin
LN.weeks = _T("%%week(s)%%");
LN.months = _T("%%month(s)%%");

LN.Browse = _T("%%Browse%%");
LN.Previous = _T("%%Previous%%");
LN.Next = _T("%%Next%%");
LN.Close = _T("%%Close%%");
    
//IP Filter
LN.IPv4Filtering = _T("%%IPv4 Filtering%%");
LN.IPv4AddrRange = _T("%%IPv4 Address Range%%");
LN.ServicesToAccept = _T("%%Services to Accept%%");
LN.ServicesToDeny = _T("%%Services to Deny%%");
LN.NoServices = _T("%%No Services%%");
LN.Priority = _T("%%Priority%%");
LN.Lowest = _T("%%Lowest%%");
LN.Highest = _T("%%Highest%%");

LN.IPv6Addr = _T("%%IPv6 Address%%");
LN.IPv6Filtering = _T("%%IPv6 Filtering%%");

LN.IPMACFiltering = _T("%%IP/MAC Filtering%%");

LN.OnexSecurity = _T("%%802.1x Security%%");
LN.AuthMethods = _T("%%Authentication Methods%%");

//ENS
LN.EveryPages = _T("%%Every Pages%%");
LN.EveryWeek = _T("%%Every Week%%");
LN.Daily = _T("%%Daily%%");
LN.Weekly = _T("%%Weekly%%");
LN.Monthly = _T("%%Monthly%%");
LN.Sunday = _T("%%Sunday%%");
LN.Monday = _T("%%Monday%%");
LN.Tuesday = _T("%%Tuesday%%");
LN.Wednesday = _T("%%Wednesday%%");
LN.Thursday = _T("%%Thursday%%");
LN.Friday = _T("%%Friday%%");
LN.Saturday = _T("%%Saturday%%");
LN.EveryMonth = _T("%%Every Month%%");
LN.PaperJam = _T("%%Paper Jam%%");
LN.ScannerWarning = _T("%%Scanner Warning%%");
LN.CoverOpen = _T("%%Cover Open%%");
LN.PaperEmptyOrMissing = _T("%%Paper Empty or Missing%%");
LN.ServiceCall = _T("%%Service Call%%");
LN.OperCall = _T("%%Operation Call%%");
LN.EachEmailLenErr = _T("%%The maximum length of each Email is {0}.%%");

//PCL
LN.TypeFace = _T("%%Typeface%%");
LN.SymbolSet = _T("%%Symbol Set%%");
LN.Lines = _T("%%Lines%%");
LN.Pitch = _T("%%Pitch%%");
LN.PointSize = _T("%%Point Size%%");
LN.Courier = _T("%%Courier%%");

LN.Security = _T("%%Security%%");
LN.SystemSecurity = _T("%%System Security%%");
LN.SecuritySummary = _T("%%Security Summary%%");
LN.SecurityInformation = _T("%%Security Information%%");

LN.InformationHiding = _T("%%Information Hiding%%");
LN.FactoryDefault = _T("%%Factory default%%");
LN.SystemReboot = _T("%%System Reboot%%");
LN.NetworkSecurity = _T("%%Network Security%%");
LN.DigitalCertificate = _T("%%Digital Certificate%%");

LN.IPSecurity = _T("%%IP Security%%");
LN.SNMPv3Settings = _T("%%SNMPv3 settings%%");
LN.ExtAuthSrv = _T("%%External Authentication Server%%");
LN.UserAccessControl = _T("%%User Access Control%%");
LN.Maintenance = _T("%%Maintenance%%");
LN.ContactInformation = _T("%%Contact Information%%");
LN.Link = _T("%%Link%%");

LN.Finisher = _T("%%Finisher%%");
LN.ExtMemory = _T("%%Extended Memory%%");
LN.Confirmation = _T("%%Confirmation%%");
LN.Wireless = _T("%%Wireless%%");
LN.Deny = _T("%%Deny%%");

LN.DocBoxManagement = _T("%%Document Box Management%%");
LN.PublicBoxDel = _T("%%Public Box Deletion%%");
LN.RecFaxSaving = _T("%%Received Fax Saving%%");

// Wireless
LN.OperationMode = _T("%%Operation Mode%%");
LN.Adhoc = _T("%%Ad-hoc%%");
LN.Infrastructure = _T("%%Infrastructure%%");

LN.HddDataEnc= _T("%%Mass Storage Device Data Encryption%%");
LN.HddSecurity= _T("%%Mass Storage Device Security%%");
LN.Support= _T("%%Support%%");
LN.Cloning=_T("%%Cloning%%");

LN.RebootAlertMsg=_T("%%Your selection can be applied after rebooting.%%");

//epson
LN.Epson = _T("%%Epson%%");
LN.EpsonIBM = _T("%%EPSON/IBM%%");
LN.Font = _T("%%Font%%");
LN.AutoWrap = _T("%%Auto Wrap%%");
LN.CharacterSet = _T("%%Character Set%%");
LN.CharacterTable = _T("%%Character Table%%");
LN.LPI = _T("%%LPI%%");
LN.Pitch = _T("%%Pitch%%");
LN.FormLine = _T("%%Form Lines%%");
LN.AdjustTopMargin = _T("%%Adjust Top Margin%%");

//KSC5843
LN.KSC5843 = _T("%%KSC5843%%");
LN.Code = _T("%%Code%%");
LN.CPI = _T("%%CPI%%");
LN.LPI = _T("%%LPI%%");
LN.Zoom = _T("%%Zoom%%");
LN.TopMargin = _T("%%Top Margin%%");
LN.SiteMode = _T("%%Site Mode%%");

//KSSM
LN.KSSM = _T("%%KSSM%%");

//KSC5895
LN.KSC5895 = _T("%%KSC5895%%");

// Eco
LN.EcoOn=_T("%%Eco ON%%");
LN.EcoOff=_T("%%Eco OFF%%");
LN.Eco=_T("%%Eco%%");
LN.EcoSimulatorWarningMsg=_T("%%This simulator only provides estimates.%%");

//XOAWeb
LN.XOAWeb = _T("%%XOA Web%%");
LN.HomeURL = _T("%%Home URL%%");
LN.XOAWebSSLEnable = _T("%%Secure XOA Web via SSL%%");
LN.XOAWebSecurityMode = _T("%%Security Mode%%");

//Time Setup
LN.Time = _T("%%Time%%");
LN.Time_Setup = _T("%%Time Setup%%");
LN.General_Setup = _T("%%General Setup%%");
LN.SNTP_SERV_Setup = _T("%%SNTP Server Setup%%");
LN.ApplyPCTime = _T("%%Apply Your PC Time%%");
LN.IPHost = _T("%%IPv4 Address or Host Name%%");	
LN.IPHostDesc = _T("%%Note: If Host Name is selected, the DNS Server Address should be mentioned in TCP/IP settings page.%%");	
LN.SNTPServer = _T("%%SNTP Server%%");	
LN.EnableSNTPBroadDesc = _T("%%Note: If SNTP server is not responding, try to search time server with broadcast%%");
LN.SNTPServerStatus = _T("%%SNTP Server Status%%");
LN.SNTPBroadcast = _T("%%SNTP Broadcast%%");
LN.BroadcastStatus = _T("%%Broadcast Status%%");
LN.SNTPRequestDesc = _T("%%Note: SNTP request is sent once at boot-up time.%%");
LN.TimeZone = _T("%%Time Zone%%");
LN.DSTEnableDesc = _T("%%Automatically adjust clock for daylight saving changes%%");

//LMS
LN.Details = _T("%%Details%%");

