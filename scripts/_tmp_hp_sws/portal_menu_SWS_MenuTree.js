
Ext.namespace('SWS.PORTAL.MENU');

SWS.PORTAL.MENU.MenuList = [];


SWS.PORTAL.MENU.LoadMenuList = function(){
	if(SWS.DATA.debugMode){
		var result = SWS.UTIL.SyncLoadJOSN("/sws/app/sws_DebugMenuTree.json");
		if(result.retCode == SWS.DATA.JSON.success){
			SWS.PORTAL.MENU.MenuList = result.obj;
		}
	}
	else	{
		SWS.PORTAL.MENU.MenuList = [
{id:"Tab_Home", pid:"_HOME_", text:"Home", url:"/sws/app/Information/home/home.html"},
{id:"Tab_Information", pid:"_GENERAL_", text:"Information", url:"/sws/app/Information/"},
{id:"Information", pid:"Tab_Information", text:"Information", url:"/sws/app/Information/"},
{id:"ActiveAlert", pid:"Information", text:"Active Alerts", url:"/sws/app/information/activealert/activealert.html"},
{id:"Supplies", pid:"Information", text:"Supplies", url:"/sws/app/information/supplies/supplies.html"},
{id:"Counters", pid:"Information", text:"Usage Counters", url:"/sws/app/information/counters/counters.html"},
{id:"Current_Settings", pid:"Information", text:"Current Settings", url:"/sws/app/information/currentsettings"},
{id:"Machine_Info", pid:"Current_Settings", text:"Machine Information", url:"/sws/app/information/currentsettings"},
{id:"System_Info", pid:"Machine_Info", text:"System", url:"/sws/app/information/currentsettings/machine/system/system_info.html"},
{id:"Printer_Info", pid:"Machine_Info", text:"Printer", url:"/sws/app/information/currentsettings/machine/printer/printer_info2.html"},
{id:"Tab_Maintenance", pid:"_GENERAL_", text:"Maintenance", url:"/sws/app/maintenance/"},
{id:"Maintenance", pid:"Tab_Maintenance", text:"Maintenance", url:"/sws/app/maintenance/"},
{id:"Firmware_Update", pid:"Maintenance", text:"Firmware Version", url:"/sws/app/maintenance/fw/fwupgrade.html"},
{id:"Contact_Information", pid:"Maintenance", text:"Contact Information", url:"/sws/app/maintenance/contact/contact.html"},
{id:"Link", pid:"Maintenance", text:"Link", url:"/sws/app/maintenance/link/link.html"},
{id:"Direct_Print", pid:"_GNB_", text:"Direct Print", url:"/sws/app/gnb/directPrint/directPrint.html"},
{id:"login", pid:"_GNB_", text:"Login", url:"/sws/app/gnb/login/login.html"}];
	}

	for(var i=0; i < SWS.PORTAL.MENU.MenuList.length; i++) {
		SWS.PORTAL.MENU.MenuList[i].text = _T(SWS.PORTAL.MENU.MenuList[i].text);
	}
		
}





SWS.PORTAL.MENU.CreateTabNodeForGNB = function(id)	
{
	this.name = SWS.PORTAL.MENU.MenuList[id].text;
	this.id = SWS.PORTAL.MENU.MenuList[id].id;
	this.mainPanelUrl = SWS.PORTAL.MENU.MenuList[id].url.toLowerCase();
}

SWS.PORTAL.MENU.CreateHomeMenu = function(id)	
{
	this.name = SWS.PORTAL.MENU.MenuList[id].text;
	this.id = SWS.PORTAL.MENU.MenuList[id].id;
	this.mainPanelUrl = SWS.PORTAL.MENU.MenuList[id].url.toLowerCase();
}

SWS.PORTAL.MENU.CreateChildrenNode = function(parentNode, startIdx)
{
	var menuList = SWS.PORTAL.MENU.MenuList;
	var idx, childIdx;
	var childrenArray = []

	for( idx=startIdx, childIdx=0; idx < menuList.length; idx++)
	{
		if(menuList[idx].pid == parentNode.id)
		{
			var children = {};
			children.text = menuList[idx].text;
			children.id = menuList[idx].id;			
			children.mainPanelUrl = menuList[idx].url.toLowerCase(); 
			children.iconCls = "treenode-no-icon";
			children.sel = false;
			children.leaf = false;
			children.menuLocation = "navi";
			children.singleClickExpand = true; 
			children.parent = parentNode;
			children.menuDepth = children.parent.menuDepth + 1;
			children.expanded = false;
			if(children.menuDepth < 4)
				children.expanded = true;
			children.children = SWS.PORTAL.MENU.CreateChildrenNode(children, idx);
			if(children.children.length == 0)
			{
				children.leaf = true;
				if(Ext.isSafari2 || Ext.isSafari3)
					children.href = "javascript:SWS.UTIL.GotoURL();";
			}
			childrenArray.push(children);
			childIdx++;
		}
	}

	return childrenArray;
}

SWS.PORTAL.MENU.CreateSubNode = function(id)	
{
	var menuList = SWS.PORTAL.MENU.MenuList;

	this.text = menuList[id].text;
	this.name = menuList[id].text;
	this.id = menuList[id].id;
	this.mainPanelUrl = menuList[id].url.toLowerCase(); 
	this.iconCls = "treenode-no-icon";
	this.sel = false;
	this.leaf = true;
	if(Ext.isSafari2 || Ext.isSafari3)
		this.href = "javascript:SWS.UTIL.GotoURL();";
	this.expanded = true;
	this.singleClickExpand = true; 
	this.menuLocation = "sub";
	this.menuDepth = 2;
	menuList[id] = this.menuDepth;
	this.selectedMenuId = this.id;
}

SWS.PORTAL.MENU.CreateTabNode = function(id)	
{
	var idx, childIdx;

	this.name = SWS.PORTAL.MENU.MenuList[id].text;
	this.id = SWS.PORTAL.MENU.MenuList[id].id;
	this.mainPanelUrl = SWS.PORTAL.MENU.MenuList[id].url.toLowerCase(); 
	this.iconCls = "";
	this.sel = false;
	this.menuLocation = "tab";
	this.menuDepth = 1;
	SWS.PORTAL.MENU.MenuList[id].menuDepth = this.menuDepth;
	this.parent = null;
}

SWS.PORTAL.MENU.MakeMenuTree = function()	
{
	var idx, idx2, childIdx;
	
	SWS.PORTAL.MENU.LoadMenuList();
	
	var menuList = SWS.PORTAL.MENU.MenuList;
	
	SWS.PORTAL.MENU.HomeMenu = null;
	for( idx=0, childIdx=0; idx < menuList.length; idx++)
	{
		if(menuList[idx].pid == "_HOME_")
		{
			SWS.PORTAL.MENU.HomeMenu = new SWS.PORTAL.MENU.CreateHomeMenu(idx);
			break;
		}
	}

	var menuTree = [];
	/* Create Tab menu tree */
	for( idx=0, childIdx=0; idx < menuList.length; idx++)
	{
		if(menuList[idx].pid == "_GENERAL_")
		{
			menuTree[childIdx] = new SWS.PORTAL.MENU.CreateTabNode(idx);
			childIdx++;
		}
	}

	/* Create Sub menu tree */
	for(idx=0 ; idx < menuTree.length; idx++) {
		menuTree[idx].submenu = [];
		for( idx2=0, childIdx=0; idx2 < menuList.length; idx2++){
			if(menuList[idx2].pid ==menuTree[idx].id){
				menuTree[idx].submenu[childIdx] = new SWS.PORTAL.MENU.CreateSubNode(idx2);
				menuTree[idx].submenu[childIdx].parent = menuTree[idx];
				menuTree[idx].submenu[childIdx].children = SWS.PORTAL.MENU.CreateChildrenNode(menuTree[idx].submenu[childIdx], idx2);

				if(menuTree[idx].submenu[childIdx].children.length == 0){
					menuTree[idx].submenu[childIdx].leaf = true;
					menuTree[idx].submenu[childIdx].selectedMenuId = menuTree[idx].submenu[childIdx].id;
				}
				else {
					menuTree[idx].submenu[childIdx].leaf = false;
					var node = menuTree[idx].submenu[childIdx];
//					while(typeof node.children != 'undefined' && (node.children.length > 0) && (node.children[0].leaf != true))
					while(typeof node == 'object' && typeof node.children == 'object' && 
						node.children.length > 0 && node.children[0].leaf != true)
						node = node.children[0];
					if(node.children.length > 0 && node.children[0].leaf == true)
						menuTree[idx].submenu[childIdx].selectedMenuId = node.children[0].id;
				}				
				childIdx++;
			}
		}
	}


	SWS.PORTAL.MENU.MainMenuTree = menuTree;


	SWS.PORTAL.MENU.GNBMenuTree = new Array();
	for( idx=0, childIdx=0; idx < menuList.length; idx++)
	{
		if(menuList[idx].pid == "_GNB_")
		{
			if(menuList[idx].id == "Eco_quick" && menuList[idx].text == "__ECO_ON")
			{
				menuList[idx].text = "<img src='/sws/images/sws/eco_icon.gif' width=25 height=20 style='vertical-align:middle'>&nbsp;"+LN.EcoOn;
			}
			else if(menuList[idx].id == "Eco_quick")
			{
				menuList[idx].text = LN.EcoOff;
			}
			SWS.PORTAL.MENU.GNBMenuTree[childIdx] = new SWS.PORTAL.MENU.CreateTabNodeForGNB(idx);
			childIdx++;
		}
	}
}


SWS.PORTAL.MENU.MakeMenuTree();

SWS.PORTAL.MENU.SearchNaviTreeOfMainMenu = function(innernode, url)
{
	var naviIdx;
	var lowerUrl = url.toLowerCase();
	
	naviId = "";
	bDetected = false;
	for(naviIdx=0; naviIdx < innernode.length; naviIdx++)	
	{
		if(innernode[naviIdx].leaf && 
			innernode[naviIdx].mainPanelUrl == lowerUrl)
		{
			naviId = innernode[naviIdx].id;
			bDetected = true;
			
			return {naviId : naviId, bDetected: bDetected};
		}
		if(innernode[naviIdx].children.length)
		{
			var detectedNode = SWS.PORTAL.MENU.SearchNaviTreeOfMainMenu(innernode[naviIdx].children, lowerUrl);
			if(detectedNode.bDetected)
			{
				naviId = detectedNode.naviId;
				bDetected = true;
				return {naviId : naviId, bDetected: bDetected};
			}
		}
	}
	return {naviId : naviId, bDetected: bDetected};
}

SWS.PORTAL.MENU.SearchMainMenuTreeByUrl = function(url)	
{
	var tabIdx, subIdx, naviIdx;
	var naviNode;
	var lowerUrl = url.toLowerCase();
	
	tabId = "";
	subId = "";
	naviId = "";
	bDetected = false;

	if(SWS.PORTAL.MENU.HomeMenu != null)
	{
		if(SWS.PORTAL.MENU.HomeMenu.mainPanelUrl == lowerUrl)
		{
			return {tabId:SWS.PORTAL.MENU.HomeMenu.id, subId:'', naviId:'', bDetected:true};
		}
	}
	
	for( tabIdx=0; tabIdx < SWS.PORTAL.MENU.MainMenuTree.length; tabIdx++)
	{
		if(SWS.PORTAL.MENU.MainMenuTree[tabIdx].leaf && 
			SWS.PORTAL.MENU.MainMenuTree[tabIdx].mainPanelUrl == lowerUrl)
		{
			tabId = SWS.PORTAL.MENU.MainMenuTree[tabIdx].id;
			bDetected = true;
			return {tabId:tabId, subId:subId, naviId:naviId, bDetected:bDetected};
		}

		for(subIdx=0; subIdx< SWS.PORTAL.MENU.MainMenuTree[tabIdx].submenu.length;  subIdx++)
		{
			if(SWS.PORTAL.MENU.MainMenuTree[tabIdx].submenu[subIdx].leaf && 
				SWS.PORTAL.MENU.MainMenuTree[tabIdx].submenu[subIdx].mainPanelUrl == lowerUrl)
			{
				tabId = SWS.PORTAL.MENU.MainMenuTree[tabIdx].id;
				subId = SWS.PORTAL.MENU.MainMenuTree[tabIdx].submenu[subIdx].id;
				bDetected = true;
				return {tabId:tabId, subId:subId, naviId:naviId, bDetected:bDetected};
			}

			if(SWS.PORTAL.MENU.MainMenuTree[tabIdx].submenu[subIdx].children.length)
			{
				var naviNode = SWS.PORTAL.MENU.SearchNaviTreeOfMainMenu(
									SWS.PORTAL.MENU.MainMenuTree[tabIdx].submenu[subIdx].children, lowerUrl);
				if(naviNode.bDetected)
				{
					tabId = SWS.PORTAL.MENU.MainMenuTree[tabIdx].id;
					subId = SWS.PORTAL.MENU.MainMenuTree[tabIdx].submenu[subIdx].id;
					naviId = naviNode.naviId;
					bDetected = true;
					return {tabId:tabId, subId:subId, naviId:naviId, bDetected:bDetected};
				}
			}
		}
	}
	return {tabId:tabId, subId:subId, naviId:naviId, bDetected:bDetected};
	
}

SWS.PORTAL.MENU.RunGNBHandler= function(o)
{
	var idx;
	var text;
	
	for( idx=0; idx < SWS.PORTAL.MENU.GNBMenuTree.length; idx++)
	{
		if(SWS.PORTAL.MENU.GNBMenuTree[idx].id == o.id &&
			SWS.PORTAL.MENU.GNBMenuTree[idx].mainPanelUrl.length)
		{
			SWS.UTIL.OpenPopupWindow(SWS.PORTAL.MENU.GNBMenuTree[idx].mainPanelUrl);
			text = SWS.PORTAL.MENU.GNBMenuTree[idx].name;
			if(o.id == 'login')
				text = _T("%%Login/Logout%%");	
			SWS.PORTAL.CONTAINER.RP.AddRecentLink(text, 
							SWS.PORTAL.MENU.GNBMenuTree[idx].mainPanelUrl);
			return;
		}
	}
}

SWS.PORTAL.MENU.RunGNBByUrl= function(url)
{
	var idx;
	var lowerUrl = url.toLowerCase();
	var text;

	for( idx=0; idx < SWS.PORTAL.MENU.GNBMenuTree.length; idx++)
	{
		if(SWS.PORTAL.MENU.GNBMenuTree[idx].mainPanelUrl == lowerUrl)
		{
			SWS.UTIL.OpenPopupWindow(SWS.PORTAL.MENU.GNBMenuTree[idx].mainPanelUrl);
			text = SWS.PORTAL.MENU.GNBMenuTree[idx].name;
			if(SWS.PORTAL.MENU.GNBMenuTree[idx].id == 'login')
				text = _T("%%Login/Logout%%");	
			SWS.PORTAL.CONTAINER.RP.AddRecentLink(text, 
							SWS.PORTAL.MENU.GNBMenuTree[idx].mainPanelUrl);
			return true;
		}
	}
	return false;
}

SWS.PORTAL.MENU.GotoLinkByUrl= function(url)
{
	var menuTreeId = SWS.PORTAL.MENU.SearchMainMenuTreeByUrl(url);
	if(menuTreeId.bDetected)
	{
		var topMenuPanel = Ext.getCmp('ID_Portal_Top_Horizontal_Menu');
		topMenuPanel.gotoTargetMenu(menuTreeId.tabId, menuTreeId.subId, menuTreeId.naviId);
		
		return true;
	}

	return SWS.PORTAL.MENU.RunGNBByUrl(url);
}

