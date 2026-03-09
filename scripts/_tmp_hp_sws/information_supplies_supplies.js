ns2('SUPPLY');
ns2('SUPPLY.MACRO');

SUPPLY.JSONData = null;

SUPPLY.MACRO.StatusSliceLen = 10;
SUPPLY.MACRO.StatusSplitLen = 4;
SUPPLY.MACRO.TypeToner = 1;
SUPPLY.MACRO.TypeImagingUnit = 2;

SUPPLY.MACRO.STD_ERR_NO_ERR 								= 0x00000000;
SUPPLY.MACRO.STD_ERR_TONER_LOW 								= 0x00000001;	/*Bit[0] */
SUPPLY.MACRO.STD_ERR_TONER_EMPTY							= 0x00000002;
SUPPLY.MACRO.STD_ERR_INSTALL_TONER							= 0x00000004;
SUPPLY.MACRO.STD_ERR_INVALID_TONER							= 0x00000008;
SUPPLY.MACRO.STD_ERR_TONER_SUPPLY_ERROR						= 0x00000010;	/*Bit[4] */
SUPPLY.MACRO.STD_ERR_TONER_WORN								= 0x00000020;
SUPPLY.MACRO.STD_ERR_TONER_CARTRIDGE_FIXED_ERROR			= 0x00000040;
SUPPLY.MACRO.STD_ERR_TONER_CARTRIDGE_FIXED_ERROR2			= 0x00000080;
SUPPLY.MACRO.STD_ERR_SELECTED_CONTINUE_WHEN_REPLACE_TONER	= 0x00000100;
SUPPLY.MACRO.STD_ERR_RESERVED_9BIT							= 0x00000200;	/*Bit[9] */
SUPPLY.MACRO.STD_ERR_IMAGING_UNIT_LOW						= 0x00000400;	/*Imaging Unit*/
SUPPLY.MACRO.STD_ERR_REPLACE_IMAGING_UNIT_WORN				= 0x00000800;	/*Imaging Unit*/
SUPPLY.MACRO.STD_ERR_INSTALL_IMAGING_UNIT					= 0x00001000;	/*Imaging Unit*/
SUPPLY.MACRO.STD_ERR_IMAGING_SENSOR_ERROR					= 0x00002000;	/*Imaging Unit*/
SUPPLY.MACRO.STD_ERR_IMAGING_UNIT_FIXED_ERROR				= 0x00004000;	/*Bit[14] */	/*Imaging Unit*/
SUPPLY.MACRO.STD_ERR_IMAGING_UNIT_FIXED_ERROR2				= 0x00008000;	/*Imaging Unit*/
SUPPLY.MACRO.STD_ERR_IMAGING_UNIT_FIXED_ERROR3				= 0x00010000;	/*Imaging Unit*/
SUPPLY.MACRO.STD_ERR_INVALID_IMAGING_UNIT					= 0x00020000;	/*Imaging Unit*/
SUPPLY.MACRO.STD_ERR_RESERVED_18BIT							= 0x00040000;
SUPPLY.MACRO.STD_ERR_RESERVED_19BIT							= 0x00080000;	/*Bit[19] */
SUPPLY.MACRO.STD_ERR_TONER_CARTRIDGE_FIXED_ERROR3			= 0x00100000;
SUPPLY.MACRO.STD_ERR_IMAGING_UNIT_FIXED_ERROR4				= 0x00200000;	/*Imaging Unit*/
SUPPLY.MACRO.STD_ERR_SUPPLYING_TONER						= 0x00400000;
SUPPLY.MACRO.STD_ERR_INVALID_TONER2							= 0x00800000;
SUPPLY.MACRO.STD_ERR_INVALID_IMAGING_UNIT2					= 0x01000000;	/*Bit[24] */	/*Imaging Unit*/
SUPPLY.MACRO.STD_ERR_TONER_WORN_REFILL_TONER				= 0x02000000;
SUPPLY.MACRO.STD_ERR_SUPPLYING_TONER2						= 0x04000000;
SUPPLY.MACRO.STD_ERR_TONER_SUPPLY_ERROR_IMAGING_UNIT		= 0x08000000;	/*Bit[27] With or Without Imaging Unit*/ 
SUPPLY.MACRO.STD_ERR_TONER_EMPTY2							= 0x10000000;
SUPPLY.MACRO.STD_ERR_IMAGING_UNIT_EMPTY						= 0x20000000;	/*Bit[29] */	/*Imaging Unit*/
SUPPLY.MACRO.STD_ERR_SHAKE_TONER							= 0x40000000;	/*Bit[30] */

SUPPLY.MACRO.StatusTonerOnly = (SUPPLY.MACRO.STD_ERR_TONER_LOW | SUPPLY.MACRO.STD_ERR_TONER_EMPTY | SUPPLY.MACRO.STD_ERR_INSTALL_TONER
	|SUPPLY.MACRO.STD_ERR_INVALID_TONER | SUPPLY.MACRO.STD_ERR_TONER_SUPPLY_ERROR | SUPPLY.MACRO.STD_ERR_TONER_WORN
	|SUPPLY.MACRO.STD_ERR_TONER_CARTRIDGE_FIXED_ERROR | SUPPLY.MACRO.STD_ERR_TONER_CARTRIDGE_FIXED_ERROR2 | SUPPLY.MACRO.STD_ERR_SELECTED_CONTINUE_WHEN_REPLACE_TONER
	|SUPPLY.MACRO.STD_ERR_TONER_CARTRIDGE_FIXED_ERROR3 | SUPPLY.MACRO.STD_ERR_SUPPLYING_TONER | SUPPLY.MACRO.STD_ERR_INVALID_TONER2
	|SUPPLY.MACRO.STD_ERR_TONER_WORN_REFILL_TONER | SUPPLY.MACRO.STD_ERR_SUPPLYING_TONER2 | SUPPLY.MACRO.STD_ERR_TONER_SUPPLY_ERROR_IMAGING_UNIT
	|SUPPLY.MACRO.STD_ERR_TONER_EMPTY2 | SUPPLY.MACRO.STD_ERR_SHAKE_TONER);

SUPPLY.MACRO.StatusImagingunitOnly = (SUPPLY.MACRO.STD_ERR_IMAGING_UNIT_LOW | SUPPLY.MACRO.STD_ERR_REPLACE_IMAGING_UNIT_WORN | SUPPLY.MACRO.STD_ERR_INSTALL_IMAGING_UNIT
	|SUPPLY.MACRO.STD_ERR_IMAGING_SENSOR_ERROR | SUPPLY.MACRO.STD_ERR_IMAGING_UNIT_FIXED_ERROR | SUPPLY.MACRO.STD_ERR_IMAGING_UNIT_FIXED_ERROR2
	|SUPPLY.MACRO.STD_ERR_IMAGING_UNIT_FIXED_ERROR3 | SUPPLY.MACRO.STD_ERR_INVALID_IMAGING_UNIT | SUPPLY.MACRO.STD_ERR_IMAGING_UNIT_FIXED_ERROR4
	|SUPPLY.MACRO.STD_ERR_INVALID_IMAGING_UNIT2 | SUPPLY.MACRO.STD_ERR_IMAGING_UNIT_EMPTY);


SUPPLY.GetSTDErrStatusString = function(supplies)
{
	var statusString = "";
	var statusTmpString = "";
	var statusSplitString = "";
	var i=0;

	statusTmpString = supplies.newError;
	statusSplitString =statusTmpString.split(',');
	if(!statusTmpString.length)
		statusString = LN.MSG_READY;
	else 
	{
		if(statusSplitString.length > SUPPLY.MACRO.StatusSplitLen)
		{				
			for(i=1; i <= statusSplitString.length; i++)
			{
				if(i%SUPPLY.MACRO.StatusSplitLen){
					if(i == statusSplitString.length)
						statusString += statusSplitString[i-1]+" ";	
					else
						statusString += statusSplitString[i-1]+", ";
				}
				else{
					if(i == statusSplitString.length)
						statusString += statusSplitString[i-1]+ " ";
					else
						statusString += statusSplitString[i-1]+",<br>";
					}
			}
		}
		else
		{
			for(i=1; i <= statusSplitString.length; i++)
			{
				if(i%SUPPLY.MACRO.StatusSplitLen){
					if(i == statusSplitString.length)
						statusString += statusSplitString[i-1]+" ";	
					else
						statusString += statusSplitString[i-1]+", ";
				}
			}
		}
	}

	if((statusSplitString.length) && (statusTmpString.length))
		statusString = LN.Warning + SWS.UI.QUICKTIP2(statusString, 200);
	
	return statusString;
}

SUPPLY.CalcCapa = function(data)
{
	var capa = data / 1000;
	capa = capa.toFixed(1);
	return capa;
}

SUPPLY.MakeTonerInfo = function(toner, color)
{
	var tonerTitle;
	var tonerItemArray = new Array();	
	if(toner.opt == 0)
		return null;

	if(color == 'black') {
		tonerTitle = _T("%%Black Toner Cartridge%%");
	}
	else if(color == 'cyan') {
		tonerTitle = _T("%%Cyan Toner Cartridge%%");
	}
	else if(color == 'magenta') {
		tonerTitle = _T("%%Magenta Toner Cartridge%%");
	}
	else if(color == 'yellow') {
		tonerTitle = _T("%%Yellow Toner Cartridge%%");
	}
	else
		return null;

	var status = SUPPLY.GetSTDErrStatusString(toner);

	var capaName = LN.Capacity + SWS.UI.QUICKTIP( _T("%%Note: Declared yield value in accordance with ISO/IEC 19752.%%"), 300);

	toner.capa = SUPPLY.CalcCapa(toner.capa);

	if(toner.newError.length != 0)
	{
		var linkString = SWS.UTIL.MakeHyperLink(status, "/sws/app/information/activealert/activealert.html");
		tonerItemArray.push({fieldLabel: LN.Status, value: linkString});
	}
	else
		tonerItemArray.push({fieldLabel: LN.Status, value: status});
	
	if(SWS.DATA.defaultLanguage=="tr")
		tonerItemArray.push({fieldLabel: LN.Remaining, value: "%" + toner.remaining});
	else
		tonerItemArray.push({fieldLabel: LN.Remaining, value: toner.remaining + " %"});
	tonerItemArray.push({fieldLabel: LN.Impression, value: toner.cnt + " " + LN.Impressions });
	tonerItemArray.push({fieldLabel: capaName, value: toner.capa + " K"});
	tonerItemArray.push({fieldLabel: LN.ModelID, value: toner.id});
	tonerItemArray.push({fieldLabel: LN.SerialNumber, value: toner.serial});
	var tonnerItem = new SWS.UI.TonerGaugeSet({
		title: tonerTitle,
		zColor: color,
		zStyle: 'cartridge',
		zRemaining: toner.remaining,
		zInfoItems: tonerItemArray
	});

	return tonnerItem;
}

SUPPLY.MakeImagingInfo = function(drum, color)
{
	var imagingTitle;
	var drumItemArray = new Array();	
	
	if(drum.opt == 0 )
		return null;

	if(color == 'black') {
		imagingTitle =_T("%%Black Imaging Unit%%");
	}
	else if(color == 'cyan') {
		imagingTitle =_T("%%Cyan Imaging Unit%%");
	}
	else if(color == 'magenta') {
		imagingTitle =_T("%%Magenta Imaging Unit%%");
	}
	else if(color == 'yellow') {
		imagingTitle =_T("%%Yellow Imaging Unit%%");
	}
	else
		return null;

	var status = SUPPLY.GetSTDErrStatusString(drum);
	
	var remainName = LN.Remaining + SWS.UI.QUICKTIP( _T("%%Depend on user's job mode run length.%%"));

	drum.capa = SUPPLY.CalcCapa(drum.capa);

	if(drum.newError.length != 0)
	{
		var linkString = SWS.UTIL.MakeHyperLink(status, "/sws/app/information/activealert/activealert.html");
		drumItemArray.push({fieldLabel: LN.Status, value: linkString});
	}
	else
		drumItemArray.push({fieldLabel: LN.Status, value: status});

	if(SWS.DATA.defaultLanguage=="tr")
		drumItemArray.push({fieldLabel: remainName, value: "%" + drum.remaining});
	else
		drumItemArray.push({fieldLabel: remainName, value: drum.remaining + " %"});
	drumItemArray.push({fieldLabel: LN.Impression, value: drum.cnt + " " + LN.Impressions });
	drumItemArray.push({fieldLabel: LN.Capacity, value: drum.capa + " K"});
	drumItemArray.push({fieldLabel: LN.ModelID, value: drum.id});
	drumItemArray.push({fieldLabel: LN.SerialNumber, value: drum.serial});
	
	var imagingItem = new SWS.UI.TonerGaugeSet({
		title: imagingTitle,
		zColor: color,
		zStyle: 'imaging',
		zRemaining: drum.remaining,
		zInfoItems: drumItemArray
	});
	
	return imagingItem;
}

SUPPLY.MakeITBInfo = function(itb)
{
	var itbTitle;
	var itbItemArray = new Array();	
	
	if(itb.opt == 0)
		return null;

	var status = SUPPLY.GetSTDErrStatusString(itb);

	var remainName = LN.Remaining + SWS.UI.QUICKTIP( _T("%%Depend on user's job mode run length.%%"));

	itb.capa = SUPPLY.CalcCapa(itb.capa);

	if(itb.newError.length != 0)
	{
		var linkString = SWS.UTIL.MakeHyperLink(status, "/sws/app/information/activealert/activealert.html");
		itbItemArray.push({fieldLabel: LN.Status, value: linkString});
	}
	else
		itbItemArray.push({fieldLabel: LN.Status, value: status});

	if(SWS.DATA.defaultLanguage=="tr")
		itbItemArray.push({fieldLabel: remainName, value: "%" + itb.remaining});
	else
		itbItemArray.push({fieldLabel: remainName, value: itb.remaining + " %"});
	itbItemArray.push({fieldLabel: LN.Impression, value: itb.cnt + " " + LN.Impressions });
	itbItemArray.push({fieldLabel: LN.Capacity, value: itb.capa + " K"});
	/*
	if(itb.id.length > 0)
		itbItemArray.push({fieldLabel: LN.ModelID, value: itb.id});
	*/
	itbItemArray.push({fieldLabel: LN.SerialNumber, value: itb.serial});
	
	var itbItem = new SWS.UI.TonerGaugeSet({
		title: _T("%%Transfer Unit Information (Belt)%%"),
		zColor: 'black',
		zStyle: 'cartridge',
		zRemaining: itb.remaining,
		zInfoItems: itbItemArray
	});

	return itbItem;
}

/*Adding Coverage Classification*/
SUPPLY.CreatePageCount = function ()
{
	var data = SUPPLY.JSONData;

	var inputCountData = new Array();
	// color
	if(data.GXI_SUPPORT_COLOR==1)
	{
		inputCountData.push([LN.CoveragePageCount_0_1, data.GXI_COVERAGE_PAGE_COUNT_0_1_BLACK,data.GXI_COVERAGE_PAGE_COUNT_0_1_CYAN,data.GXI_COVERAGE_PAGE_COUNT_0_1_MAGENTA, data.GXI_COVERAGE_PAGE_COUNT_0_1_YELLOW]);	
		inputCountData.push([LN.CoveragePageCount_1_3, data.GXI_COVERAGE_PAGE_COUNT_1_3_BLACK,data.GXI_COVERAGE_PAGE_COUNT_1_3_CYAN,data.GXI_COVERAGE_PAGE_COUNT_1_3_MAGENTA, data.GXI_COVERAGE_PAGE_COUNT_1_3_YELLOW]);	
		inputCountData.push([LN.CoveragePageCount_3_5, data.GXI_COVERAGE_PAGE_COUNT_3_5_BLACK,data.GXI_COVERAGE_PAGE_COUNT_3_5_CYAN,data.GXI_COVERAGE_PAGE_COUNT_3_5_MAGENTA, data.GXI_COVERAGE_PAGE_COUNT_3_5_YELLOW]);	
		inputCountData.push([LN.CoveragePageCount_5_7, data.GXI_COVERAGE_PAGE_COUNT_5_7_BLACK,data.GXI_COVERAGE_PAGE_COUNT_5_7_CYAN,data.GXI_COVERAGE_PAGE_COUNT_5_7_MAGENTA, data.GXI_COVERAGE_PAGE_COUNT_5_7_YELLOW]);	
		inputCountData.push([LN.CoveragePageCount_7_10, data.GXI_COVERAGE_PAGE_COUNT_7_10_BLACK,data.GXI_COVERAGE_PAGE_COUNT_7_10_CYAN,data.GXI_COVERAGE_PAGE_COUNT_7_10_MAGENTA, data.GXI_COVERAGE_PAGE_COUNT_7_10_YELLOW]);	
		inputCountData.push([LN.CoveragePageCount_10_25, data.GXI_COVERAGE_PAGE_COUNT_10_25_BLACK,data.GXI_COVERAGE_PAGE_COUNT_10_25_CYAN,data.GXI_COVERAGE_PAGE_COUNT_10_25_MAGENTA, data.GXI_COVERAGE_PAGE_COUNT_10_25_YELLOW]);	
		inputCountData.push([LN.CoveragePageCount_25_50, data.GXI_COVERAGE_PAGE_COUNT_25_50_BLACK,data.GXI_COVERAGE_PAGE_COUNT_25_50_CYAN,data.GXI_COVERAGE_PAGE_COUNT_25_50_MAGENTA, data.GXI_COVERAGE_PAGE_COUNT_25_50_YELLOW]);	
		inputCountData.push([LN.CoveragePageCount_50_100, data.GXI_COVERAGE_PAGE_COUNT_50_100_BLACK,data.GXI_COVERAGE_PAGE_COUNT_50_100_CYAN,data.GXI_COVERAGE_PAGE_COUNT_50_100_MAGENTA, data.GXI_COVERAGE_PAGE_COUNT_50_100_YELLOW]);	

		var inputCountStore = new Ext.data.SimpleStore({
			fields: [
				{name: 'Toner Coverage Counter'},
				{name: 'Black'},
				{name: 'Cyan'},
				{name: 'Magenta'},
				{name: 'Yellow'}
			]
		});

		inputCountStore.loadData(inputCountData);

		SUPPLY.countTreeGrid = new SWS.UI.GridPanel({
			title: false,//'Count Usage',
			cls: 'sws-inner-table sws-inner-title-table sws-inner-table-small-row sws-inner-table-nowrap',
			autoHeight: true,
			store: inputCountStore,
			columns: [
				{id: 'Toner Coverage Counter', header: LN.TonerCoverageCounter, sortable:false, dataIndex: 'Toner Coverage Counter', width: 150, align:'left'},
				{header: LN.Black, sortable:false, dataIndex: 'Black', width: 100, align:'right'},
				{header: LN.Cyan, sortable:false, dataIndex: 'Cyan',width: 100, align:'right'},
				{header: LN.Magenta, sortable:false, dataIndex: 'Magenta', width: 100, align:'right'},
				{header: LN.Yellow, sortable:false, dataIndex: 'Yellow', width: 100, align:'right'}	
			],
		        stripeRows: true,
			disableSelection: true,
			frame: true,
			enableHdMenu: false
		});	
		
	}
	else // mono 
	{
		inputCountData.push([LN.CoveragePageCount_0_1, data.GXI_COVERAGE_PAGE_COUNT_0_1_BLACK]);
		inputCountData.push([LN.CoveragePageCount_1_3, data.GXI_COVERAGE_PAGE_COUNT_1_3_BLACK]);	
		inputCountData.push([LN.CoveragePageCount_3_5, data.GXI_COVERAGE_PAGE_COUNT_3_5_BLACK]);	
		inputCountData.push([LN.CoveragePageCount_5_7, data.GXI_COVERAGE_PAGE_COUNT_5_7_BLACK]);	
		inputCountData.push([LN.CoveragePageCount_7_10, data.GXI_COVERAGE_PAGE_COUNT_7_10_BLACK]);	
		inputCountData.push([LN.CoveragePageCount_10_25, data.GXI_COVERAGE_PAGE_COUNT_10_25_BLACK]);	
		inputCountData.push([LN.CoveragePageCount_25_50, data.GXI_COVERAGE_PAGE_COUNT_25_50_BLACK]);	
		inputCountData.push([LN.CoveragePageCount_50_100, data.GXI_COVERAGE_PAGE_COUNT_50_100_BLACK]);

		var inputCountStore = new Ext.data.SimpleStore({
			fields: [
				{name: 'Toner Coverage Counter'},
				{name: 'Black'}
			]
		});

		inputCountStore.loadData(inputCountData);

		SUPPLY.countTreeGrid = new SWS.UI.GridPanel({
			title: false,//'Count Usage',
			cls: 'sws-inner-table sws-inner-title-table sws-inner-table-small-row sws-inner-table-nowrap',
			autoHeight: true,
			store: inputCountStore,
			columns: [
				{id: 'Toner Coverage Counter', header: LN.TonerCoverageCounter, sortable:false, dataIndex: 'Toner Coverage Counter', width: 150, align:'left'},
				{header: LN.Black, sortable:false, dataIndex: 'Black', width: 100, align:'right'}
			],
		        stripeRows: true,
			disableSelection: true,
			frame: true,
			enableHdMenu: false
		});	
		
	}
}
/******/

SUPPLY.FillItems = function ()
{
	var data = SUPPLY.JSONData;
	var fieldSetArray = [];
	var tmp;
	var suppliesItems = [];

	tmp = SUPPLY.MakeTonerInfo(data.toner_black, 'black');
	if(tmp) suppliesItems.push(tmp);
	tmp = SUPPLY.MakeImagingInfo(data.drum_black, 'black');
	if(tmp) suppliesItems.push(tmp);
	
	tmp = SUPPLY.MakeTonerInfo(data.toner_cyan, 'cyan');
	if(tmp) suppliesItems.push(tmp);
	tmp = SUPPLY.MakeImagingInfo(data.drum_cyan, 'cyan');
	if(tmp) suppliesItems.push(tmp);

	tmp = SUPPLY.MakeTonerInfo(data.toner_magenta, 'magenta');
	if(tmp) suppliesItems.push(tmp);
	tmp = SUPPLY.MakeImagingInfo(data.drum_magenta, 'magenta');
	if(tmp) suppliesItems.push(tmp);

	tmp = SUPPLY.MakeTonerInfo(data.toner_yellow, 'yellow');
	if(tmp) suppliesItems.push(tmp);
	tmp = SUPPLY.MakeImagingInfo(data.drum_yellow, 'yellow');
	if(tmp) suppliesItems.push(tmp);

	for(var i =0; i < suppliesItems.length; i++)
	{
		var firstInfo = suppliesItems[i];
		var sencondInfo = null;
		if(i+1 < suppliesItems.length)
			sencondInfo = suppliesItems[++i];
			
		var suppliesPanel = new Ext.Panel({
			layout: 'column',
			border: true,
			defaults: {
				border: true
			},
			items:[
		            	{width: '380px', items: firstInfo},
		            	{width: '40px', items: new Ext.Panel({style:"padding:1px;", width:'10px'})},
		            	{width: '380px', items: sencondInfo}
			]
		});			
		fieldSetArray.push(suppliesPanel);
	}
	
	if(data.itb_catridge.opt == 1)
	{
		var itbPanel = new Ext.Panel({
			layout: 'column',
			border: true,
			defaults: {
				border: true
			},
			items:[
		            	{width: '380px', items: SUPPLY.MakeITBInfo(data.itb_catridge)},
		            	{width: '40px', items: new Ext.Panel({style:"padding:1px;", width:'10px'})}
			]
		});

		fieldSetArray.push(itbPanel);
	}

	if(data.GXI_DRUM_DEVELOPER_UNIT_LIFE_CNT_SUPPORT)
	{
		var menuArray2 = [];

		menuArray2.push({
			fieldLabel: _T("%%Developer Unit Life Count%%"),	
			value: data.GXI_DRUM_DEVELOPER_UNIT_LIFE_CNT + " " + LN.Impressions
		});
		menuArray2.push({
			fieldLabel: _T("%%Developer Life Count%%"),	
			value: data.GXI_DRUM_DEVELOPER_LIFE_CNT + " " + LN.Impressions
		});

		fieldSetArray.push(	{
			xtype: 'zfieldset', 
			title: _T("%%Imaging Unit Information (Developer)%%"),
			defaults: {
				xtype: 'zinfofield',
				zLabelLeftPad: SWS.DATA.menuLabelIdent
			},
			items:menuArray2
		});	
	}
	
	var menuArray = [];

	if(data.consume_opt.fuser_kit_max > 0)
		menuArray.push({
			fieldLabel: _T("%%Fuser Life%%"),	
			value: data.consume.fuser_kit + "/" + data.consume_opt.fuser_kit_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
		});
	if(data.consume_opt.btr_kit_max > 0)
		menuArray.push({
			fieldLabel: _T("%%Transfer Roller Life%%"),	
			value: data.consume.btr_kit + "/" + data.consume_opt.btr_kit_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
		});

	var tray1Name = LN.Tray + " 1";
	var tray2Name = LN.Tray + " 2";
	var tray3Name = LN.Tray + " 3";
	var tray4Name = LN.Tray + " 4";
	var tray5Name = LN.Tray + " 5";

	if(data.consume_opt.roller_bypass_max > 0){
		menuArray.push({
			fieldLabel: _T("%%Tray 1 Roller Life%%"),	
			value: data.consume.roller_bypass + "/" + data.consume_opt.roller_bypass_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
		});
	}
	
	if(data.consume_opt.forward_roller_mp_max > 0){
		menuArray.push({
			fieldLabel: tray1Name + " " + LN.ForwardRollerLife,	
			value: data.consume.forward_roller_mp + "/" + data.consume_opt.forward_roller_mp_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
		});
	}

	if(data.consume_opt.retard_roller_mp_max > 0){
		menuArray.push({
			fieldLabel: tray1Name + " " + LN.RetardRollerLife,	
			value: data.consume.retard_roller_mp + "/" + data.consume_opt.retard_roller_mp_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
		});
	}
	
	if(data.consume_opt.mp_rubber_pad_life_max > 0){
		menuArray.push({
			fieldLabel: _T("%%Tray 1 Rubber Pad Life%%"),	
			value: data.consume.mp_rubber_pad_life + "/" + data.consume_opt.mp_rubber_pad_life_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
		});
	}
	
	if(data.consume_opt.roller_tray1_max > 0)
		menuArray.push({
			fieldLabel: _T("%%Tray 2 Roller Life%%"),
			value: data.consume.roller_tray1 + "/" + data.consume_opt.roller_tray1_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
		});

	if(data.consume_opt.forward_roller_tray1_max > 0)
		menuArray.push({
			fieldLabel: tray2Name + " " + LN.ForwardRollerLife,	
			value: data.consume.forward_roller_tray1 + "/" + data.consume_opt.forward_roller_tray1_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
		});
	if(data.consume_opt.torque_limiter_tray1_max > 0)
		menuArray.push({
			fieldLabel: tray2Name + " " + LN.RetardRollerLife,
			value: data.consume.torque_limiter_tray1 + "/" + data.consume_opt.torque_limiter_tray1_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
		});

	if(data.consume_opt.hcf_opt == 0x1)
		tray2Name += " (HCF)";
	else if(data.consume_opt.hcf_opt == 0x2)
		tray3Name += " (HCF)";
	else if(data.consume_opt.hcf_opt == 0x4)
		tray4Name += " (HCF)";

	if(data.consume_opt.tray2_opt == 1){
		if(data.consume_opt.roller_tray2_max > 0)
			menuArray.push({
				fieldLabel:  _T("%%Tray 3 Roller Life%%"),	
				value: data.consume.roller_tray2 + "/" + data.consume_opt.roller_tray2_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
			});

		if(data.consume_opt.forward_roller_tray2_max > 0)
			menuArray.push({
				fieldLabel: tray3Name + " " + LN.ForwardRollerLife,	
				value: data.consume.forward_roller_tray2 + "/" + data.consume_opt.forward_roller_tray2_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
			});
		if(data.consume_opt.retard_roller_tray2_max > 0)
			menuArray.push({
				fieldLabel: tray3Name + " " + LN.RetardRollerLife,	
				value: data.consume.retard_roller_tray2 + "/" + data.consume_opt.retard_roller_tray2_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
			});
	}
	if(data.consume_opt.tray3_opt == 1){
		if(data.consume_opt.roller_tray3_max > 0)
			menuArray.push({
				fieldLabel:  _T("%%Tray 4 Roller Life%%"),	
				value: data.consume.roller_tray3 + "/" + data.consume_opt.roller_tray3_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
			});

		if(data.consume_opt.forward_roller_tray3_max > 0)
			menuArray.push({
				fieldLabel: tray4Name + " " + LN.ForwardRollerLife,	
				value: data.consume.forward_roller_tray3 + "/" + data.consume_opt.forward_roller_tray3_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
			});
		if(data.consume_opt.retard_roller_tray3_max > 0)
			menuArray.push({
				fieldLabel: tray4Name + " " + LN.RetardRollerLife,	
				value: data.consume.retard_roller_tray3 + "/" + data.consume_opt.retard_roller_tray3_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
			});
	}
	
	if(data.consume_opt.tray4_opt == 1){
		if(data.consume_opt.roller_tray4_max > 0)
			menuArray.push({
				fieldLabel:  _T("%%Tray 5 Roller Life%%"),	
				value: data.consume.roller_tray4 + "/" +  data.consume_opt.roller_tray4_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
			});

		if(data.consume_opt.forward_roller_tray4_max > 0)
			menuArray.push({
				fieldLabel: tray5Name + " " + LN.ForwardRollerLife,	
				value: data.consume.forward_roller_tray4 + "/" + data.consume_opt.forward_roller_tray4_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
			});
		if(data.consume_opt.retard_roller_tray4_max > 0)
			menuArray.push({
				fieldLabel: tray5Name + " " + LN.RetardRollerLife,	
				value: data.consume.retard_roller_tray4 + "/" + data.consume_opt.retard_roller_tray4_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
			});
	}

	if(data.consume_opt.cleaning_pad_max > 0){
		menuArray.push({
			fieldLabel: LN.DustCleaningKitLife,	
			value: data.consume.cleaning_pad + "/" + data.consume_opt.cleaning_pad_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
		});
	}

	if(data.consume_opt.adf_roller_life_max > 0){
		menuArray.push({
			fieldLabel: _T("%%ADF Roller Life%%"),	
			value: data.consume.adf_roller_life + "/" + data.consume_opt.adf_roller_life_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
		});
	}

	if(data.consume_opt.adf_rubber_pad_life_max > 0){
		menuArray.push({
			fieldLabel: _T("%%ADF Rubber Pad Life%%"),	
			value: data.consume.adf_rubber_pad_life + "/" + data.consume_opt.adf_rubber_pad_life_max + " " + "(" + LN.Impressions + "/" + LN.Life + ")"
		});
	}

	if(data.consume_opt.ozone_filter_life_support_option){
		menuArray.push({
			fieldLabel: _T("%%Ozone Filter Life%%"),	
			value: MACHINE.DB.ozoneFilterStatus.GetText(data.consume.ozone_filter_life_status)
		});
	}

	if(data.consume_opt.finisher_stapler_cartridge_support_option){
		menuArray.push({
			fieldLabel: _T("%%Finisher Stapler Cartridge%%"),	
			value: MACHINE.DB.finisherStatus.GetText(data.consume.finisher_stapler_cartridge_status)
		});
	}
	
	if(data.consume_opt.waste_toner_containier_support_option){
		menuArray.push({
			fieldLabel: _T("%%Waste Toner Container%%"),	
			value: MACHINE.DB.wasteTonerStatus.GetText(data.consume.waste_toner_containier_status)
		});
	}	


	fieldSetArray.push(	{
		xtype: 'zfieldset', 
		title: _T("%%Consumables Information%%"),
		defaults: {
			xtype: 'zinfofield',
			zLabelLeftPad: SWS.DATA.menuLabelIdent
		},
		items:menuArray
	});	
		
	return fieldSetArray;
}

SUPPLY.LoadData = function () {
	var result = SWS.UTIL.SyncLoadJOSN("/sws/app/information/supplies/supplies.json");
	if(result.retCode == SWS.DATA.JSON.success){
		SUPPLY.JSONData = result.obj;
		return true;
	}
	else	{
		SWS.UTIL.RenderAppPage(result.obj);
		return false
	}
}

SUPPLY.Initialize = function () {
	
	if(!SUPPLY.LoadData()) {
		return;
	}

	var formPanel = new SWS.UI.PANEL.appBodyPanel({
		width:SWS.DATA.mainBodyMediumWidth,
		zDestroyHandler: function(p){
			SWS.UTIL.ForceExpandInfoDeskPanel();	
		},
		items:SUPPLY.FillItems()
	});	
	var app = new SWS.UI.PANEL.AppContainter({
		title: LN.Supplies,
		items: formPanel
	});

	SWS.UTIL.RenderAppPage(app);

	SWS.UTIL.ForceCollapseInfoDeskPanel();
};

