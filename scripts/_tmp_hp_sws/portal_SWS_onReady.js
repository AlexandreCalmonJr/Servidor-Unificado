Ext.namespace('SWS');
Ext.namespace('SWS.PORTAL');
Ext.namespace('SWS.PORTAL.TIMER');
Ext.namespace('SWS.DATA');

Ext.BLANK_IMAGE_URL = "images/default/s.gif";
SWS.PORTAL.RequiredAddStytemLog = true;
SWS.PORTAL.StandardUsersData = null;
SWS.PORTAL.TIMER.AutoLogoutTime = SWS.DATA.AutoLogoutTime;
SWS.PORTAL.TIMER.NoActionSecond = 0;
SWS.PORTAL.TIMER.SessionCloseRequired = false;
SWS.PORTAL.TIMER.SessionCloseReasion = "";

SWS.PORTAL.TIMER.ChangeAutoLogoutTime = function(sec) {
	SWS.PORTAL.TIMER.AutoLogoutTime = sec;
	if(sec == 0)
		SWS.UTIL.ChangeLoginText(LN.Logout);
};

SWS.PORTAL.TIMER.TimerHandler = function(e) {
	if(SWS.UTIL.IsStopAutoLogoutTime())
		return;
	SWS.PORTAL.TIMER.NoActionSecond = 0;
};
SWS.PORTAL.TIMER.TimerHandler2 = function(e) {
	if(SWS.UTIL.IsStopAutoLogoutTime())
		return;
	
	if(typeof e.xy != 'object')
		return;
	
	var diffx = Math.abs(this.zPreMousePos.x - e.xy[0]);
	var diffy = Math.abs(this.zPreMousePos.y - e.xy[1]);
	if(diffx < 5 && diffy < 5)
		return;

	this.zPreMousePos.x = e.xy[0];
	this.zPreMousePos.y = e.xy[1];
	
	SWS.PORTAL.TIMER.NoActionSecond = 0;
};

SWS.PORTAL.TIMER.CheckAutoLogout = function() {
	if(!SWS.UTIL.IsAdmin())
		return;
	if(SWS.UTIL.IsStopAutoLogoutTime())
		return;
	if(SWS.PORTAL.TIMER.AutoLogoutTime == 0)
	{
		return;
	}
	if(SWS.PORTAL.TIMER.NoActionSecond >= SWS.PORTAL.TIMER.AutoLogoutTime) {
		SWS.PORTAL.TIMER.AutoLogoutTime = 0;
		SWS.UTIL.LogoutRequest("Auto");
		SWS.UTIL.GotoURL('/sws/index.html');
		return;
	}
	var remain = SWS.PORTAL.TIMER.AutoLogoutTime - SWS.PORTAL.TIMER.NoActionSecond;
	var min = parseInt(remain/60);
	var sec = parseInt(remain - (min * 60));
	var minStr = (min < 10) ? "0" + min : min;
	var secStr = (sec < 10) ? "0" + sec : sec;
	
	SWS.UTIL.ChangeLoginText(LN.Logout + " (" + minStr + ":" + secStr + ")");
	SWS.PORTAL.TIMER.NoActionSecond++;
}

SWS.PORTAL.TIMER.CheckSession = function() {
	if(!SWS.UTIL.IsAdmin())
		return;

	var autoLogout = SWS.UTIL.Cookie.Get("autologout", "");
	if(autoLogout.length > 0 && autoLogout == "yes")
		return;
		
	var sessionInfo = SWS.UTIL.Cookie.Get("sessionAbortID", "");
	if(sessionInfo == "")
		return;
	SWS.DATA.loginMode = 0;
	SWS.UTIL.Cookie.Clear("sessionAbortID");
	SWS.UTIL.Cookie.Clear("ChangePWDFlag");
	SWS.UTIL.Cookie.Clear("PasswordExpiration");
	SWS.PORTAL.TIMER.SessionCloseRequired = true;
	SWS.PORTAL.TIMER.SessionCloseReasion = "<br>" + _T("%%Please login again.%%");
	
	SWS.UTIL.Swshyperlink("/sws/app/gnb/login/login.html");
}

SWS.PORTAL.TIMER.PollerTask = function() {
	SWS.PORTAL.TIMER.CheckAutoLogout();
	SWS.PORTAL.TIMER.CheckSession();
}

SWS.PORTAL.TIMER.Scheduler = function() {
	SWS.PORTAL.TIMER.PollerTask();
	setTimeout(function(){SWS.PORTAL.TIMER.Scheduler();}, 1000);
}

SWS.PORTAL.focusObj = null;
SWS.PORTAL.FocusActive = function(obj){
	
	if(SWS.PORTAL.focusObj != null && typeof SWS.PORTAL.focusObj == 'object'
	  		&& obj != SWS.PORTAL.focusObj){	  			
		SWS.PORTAL.focusObj.removeClass('sws-title-panel-active');
	}
	obj.addClass('sws-title-panel-active');
	SWS.PORTAL.focusObj = obj;
}


SWS.InitializePortal = function() {
	Ext.QuickTips.init();
	
	Ext.apply(Ext.QuickTips.getQuickTip(), {
		dismissDelay: 60000,
		showDelay:0,
		shadow :false,
		maxWidth:500
	});
	
	//Ext.override(Ext.Tip,{frame: false});

	SWS.UI.CreateLock();

	SWS.UTIL.Cookie.Set("xuser", "SWS2.0");
	if(SWS.DATA.loginMode)
		SWS.UTIL.Cookie.Set("login", "true");
	else
		SWS.UTIL.Cookie.Set("login", "false");
	
	var autologout = SWS.UTIL.Cookie.Get("autologout", "no");
	if(autologout == "yes") {
		var msg = '';
		if(SWS.DATA.SWSAdminUseAAA)
			msg = String.format(_T("%%This interface logged out automatically because user don't activate any action during {0} seconds%%"), SWS.PORTAL.TIMER.AutoLogoutTime);
		else
			msg = String.format(_T("%%This interface logged out automatically because user don't activate any action during {0} minutes%%"), parseInt(SWS.PORTAL.TIMER.AutoLogoutTime / 60));
		
		SWS.UI.WarningMsg(LN.AutoLogout, msg);
		SWS.UTIL.Cookie.Clear("autologout");
	}
		

	SWS.PORTAL.TIMER.Scheduler();
}


Ext.onReady(function() {
	SWS.InitializePortal();

	SWS.PORTAL.Viewport = new Ext.Viewport({
	        layout: 'sws-viewport-layout',
		id : 'ID_Portal_Viewport',
		zPreMousePos: {x:0, y: 0},
		
	        items: [{
	        		border: false,
	        		minWidth: SWS.PORTAL.LAYOUT.ScrollMinWidth,
	        		minHeight: SWS.PORTAL.LAYOUT.ScrollMinWidthHeight,	       
	        		layout: 'border',	        		
	        		defaults: {border: false},
	        		items: [{
		        		region : 'north',
						style: 'border-top: 5px solid #0096D6',
		        		height : SWS.PORTAL.LAYOUT.TOPPANEL.TopPanelHeight,
		        		layout: 'fit',
		        		items: new SWS.PORTAL.CONTAINER.TOP.TopPanel({id : 'ID_Portal_TopPanel'})
		        	},{
			      		region : 'center',
			      		layout: 'fit',
			          	items: new SWS.PORTAL.CONTAINER.CENTER.CenterPanel({id: 'ID_Portal_CenterPanel'})
			        },{
			        	region : 'east',	
			    	   	
				    	collapsible: true,
						frame: true,
						split: false,
						animCollapse:false,	
						animFloat :false,
						autoHide :true,
				       	width: SWS.PORTAL.LAYOUT.RP.RelationalPanelWidth ,
			        	minWidth: SWS.PORTAL.LAYOUT.RP.RelationalPanelMinWidth,
					maxWidth: SWS.PORTAL.LAYOUT.RP.RelationalPanelMaxWidth,
					xtype: 'eastPanel'
			        },{
			        	region : 'south',
			        	height: SWS.PORTAL.LAYOUT.BOTTOM.BottomPanelHeight,
			        	layout: 'fit',
			        	items: new SWS.PORTAL.CONTAINER.BOTTOM.BottomPanel({id : 'ID_Portal_BotomPanel'})  	
			        }]
		}]
	});

	var panelEl = 	SWS.PORTAL.Viewport.getEl(this.id);
	panelEl.on("mousemove", SWS.PORTAL.TIMER.TimerHandler2, SWS.PORTAL.Viewport);
	panelEl.on("mousewheel", SWS.PORTAL.TIMER.TimerHandler, SWS.PORTAL.Viewport);
	panelEl.on("mousedown", SWS.PORTAL.TIMER.TimerHandler, SWS.PORTAL.Viewport);
	panelEl.on("keydown", SWS.PORTAL.TIMER.TimerHandler, SWS.PORTAL.Viewport);

	var bRedirectFound = false;
	if(typeof top.sws_redirect_location == 'string' && top.sws_redirect_location.length > 0)
	{
		var menuTreeId = SWS.PORTAL.MENU.SearchMainMenuTreeByUrl(top.sws_redirect_location);
		bRedirectFound = menuTreeId.bDetected;
	}

	SWS.UTIL.ChangeLoginText(SWS.UTIL.IsAdmin() ? LN.Logout : LN.Login);
	// Load Home page here
	if(SWS.PORTAL.MENU.HomeMenu)
	{
		if(bRedirectFound)
		{
			SWS.UTIL.Swshyperlink(top.sws_redirect_location);
			top.sws_redirect_location = "";
		}
		else
		{
			SWS.UTIL.GetTopPanelComp().LoadTargetPage(false, SWS.PORTAL.MENU.HomeMenu);
			if(top.sws_redirect_location.length > 0)
				SWS.UTIL.Swshyperlink("/sws/app/gnb/login/login.html");
		}
	}
	else if(typeof SWS.PORTAL.MENU.FirstPage == 'string')
	{
		SWS.UTIL.Swshyperlink(SWS.PORTAL.MENU.FirstPage);
	}

//	Ext.log('Welcome to SWS 2.0 console');
});

