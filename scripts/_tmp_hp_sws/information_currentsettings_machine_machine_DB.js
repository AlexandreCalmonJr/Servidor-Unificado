ns2('MACHINE');
ns2('MACHINE.DB');

MACHINE.DB.machineOnOff = new SWS.UTIL.DataArray([
	[LN.Off,				0x00000001],
	[LN.On,				0x00000002]
]);

MACHINE.DB.SoundOnMute = new SWS.UTIL.DataArray([
	[LN.On,				0x00000002],
	[_T("%%Mute%%"),				0x00000001]	
]);

MACHINE.DB.paperSize = new SWS.UTIL.DataArray([
	[_T("%%Letter%%"),				0x00000001],
	[_T("%%Legal%%"),				0x00000002],
	[_T("%%A4%%"),					0x00000004],
	[_T("%%Executive%%"),			0x00000008],
	[_T("%%B5(JIS)%%"),				0x00000010],
	[_T("%%B5(ISO)%%"),				0x00000020],
	[_T("%%Envelope #10%%"),		0x00000040],
	[_T("%%Envelope Monarch%%"),	0x00000080],
	[_T("%%Envelope DL%%"),			0x00000100],
	[_T("%%Envelope C5%%"),			0x00000200],
	[_T("%%Postcard A6%%"),			0x00000400],
	[_T("%%Envelope C6%%"),			0x00000800],
	[_T("%%Oficio 8.5x13%%"),		0x00001000],
	[_T("%%A5%%"),					0x00002000],
	[_T("%%Statement%%"),			0x00004000],
	[_T("%%A6%%"),					0x00008000],
	[_T("%%Ledger%%"),				0x00010000],
	[_T("%%A3%%"),					0x00020000],
	[_T("%%JIS B4%%"),				0x00040000],
	[_T("%%Postcard 100x148%%"),	0x00080000],
	[_T("%%Jpostd%%"),				0x00100000],
	[_T("%%Custom%%"),				0x00200000],
	[_T("%%US Post card%%"),		0x00400000],
	["3x5",							0x00800000],
	[_T("%%Oficio 216x340mm%%"),	0x01000000],
	[_T("%%A5-P%%"),				0x02000000],
	[_T("%%Executive-P%%"),			0x04000000],
	[_T("%%Statement-P%%"),			0x08000000],
	[_T("%%Full-Bleed%%"),			0x10000000],
	[_T("%%B5-Envelope%%"),			0x20000000],
	[_T("%%Jpostr%%"),				0x40000000],
	[_T("%%Hagaki%%"),				0x80000000],
	[_T("%%Envelope #9%%"),			0x100000000],
	[_T("%%6 3/4 Envelope%%"),		0x200000000],	
	["4x6",							0x400000000]
]);

MACHINE.DB.paperSizeA3Spec = new SWS.UTIL.DataArray([
	[_T("%%Letter SEF%%"),			0x00000001],
	[_T("%%Legal SEF%%"),			0x00000002],
	[_T("%%A4 SEF%%"),				0x00000004],
	[_T("%%Executive SEF%%"),		0x00000008],
	[_T("%%B5(JIS) SEF%%"),			0x00000010],
	[_T("%%B5(ISO) SEF%%"),			0x00000020],
	[_T("%%Envelope #10%%"),		0x00000040],
	[_T("%%Envelope Monarch%%"),	0x00000080],
	[_T("%%Envelope DL%%"),			0x00000100],
	[_T("%%Envelope C5%%"),			0x00000200],
	[_T("%%Postcard A6%%"),			0x00000400],
	[_T("%%Envelope C6%%"),			0x00000800],
	[_T("%%Folio SEF%%"),			0x00001000],
	[_T("%%A5 SEF%%"),				0x00002000],
	[_T("%%Statement SEF%%"),		0x00004000],
	[_T("%%A6 SEF%%"),				0x00008000],
	[_T("%%Ledger%%"),				0x00010000],
	[_T("%%A3%%"),					0x00020000],
	[_T("%%JIS B4%%"),				0x00040000],
	[_T("%%Jpost%%"),				0x00080000],
	[_T("%%Jpostd%%"),				0x00100000],
	[_T("%%Custom%%"),				0x00200000],
	[_T("%%US Post card%%"),		0x00400000],
	["3x5",							0x00800000],
	[_T("%%Oficio SEF%%"),			0x01000000],
	[_T("%%A5-P%%"),				0x02000000],
	[_T("%%Executive-P%%"),			0x04000000],
	[_T("%%Statement-P%%"),			0x08000000],
	[_T("%%Full-Bleed%%"),			0x10000000],
	[_T("%%B5-Envelope%%"),			0x20000000],
	[_T("%%Jpostr%%"),				0x40000000],
	[_T("%%Hagaki%%"),				0x80000000],
	[_T("%%Envelope #9%%"),			0x100000000],
	[_T("%%6 3/4 Envelope%%"),		0x200000000],
	["4x6",							0x400000000],
	[_T("%%Postcard 100x148%%"),	0x800000000],
	[_T("%%Letter LEF%%"),			0x1000000000],
	[_T("%%A4 LEF%%"),				0x2000000000],
	[_T("%%B5(JIS) LEF%%"),			0x4000000000],
	[_T("%%Executive LEF%%"),		0x8000000000],
	[_T("%%A5 LEF%%"),				0x10000000000],
	[_T("%%B4%%"),					0x20000000000],
	[_T("%%8K SEF%%"),				0x40000000000],
	[_T("%%16K SEF%%"),				0x80000000000],
	[_T("%%16K LEF%%"),				0x100000000000],
	[_T("%%C4 Envelope%%"),			0x200000000000],
	[_T("%%B5(ISO) LEF%%"),			0x400000000000],
	[_T("%%3X5%%"),					0x800000000000]
]);

MACHINE.DB.orientation = new SWS.UTIL.DataArray([
	[_T("%%Portrait%%"),				0x00000001],
	[_T("%%Landscape%%"),				0x00000002],
	[_T("%%Reverse Landscape%%"),		0x00000004],
	[_T("%%Reverse Portrait%%"),		0x00000008]
]);

MACHINE.DB.timeFormat = new SWS.UTIL.DataArray([
	["12 " + LN.TimeFormatHour,				0x00000001],
	["24 " + LN.TimeFormatHour,				0x00000002]
]);

MACHINE.DB.dateFormat = new SWS.UTIL.DataArray([
	[_T("%%MM-DD-YY%%")	,	0x00000000],
	[_T("%%YY-MM-DD%%")	,	0x00000002],
	[_T("%%DD-MM-YY%%")	,	0x00000001]
]);
//////////////////////////////////////////
MACHINE.DB.tray = new SWS.UTIL.DataArray([
	[LN.Auto ,		0x00000001],
	[LN.Tray + " 1",			0x00000002],
	[LN.Tray + " 2",			0x00000008],
	[LN.Tray + " 3",			0x00000010],
	[LN.Tray + " 4", 			0x00000020],
	[LN.Tray + " 5", 			0x00000400],
	[LN.MPTray,				0x00000004],
	[_T("%%Manual Feeder%%"),		0x00000040],
	[_T("%%Tray1/MP%%"),			0x00000080],
	[_T("%%Tray1/2%%"),			0x00000100],
	[LN.All,				0x00000200]
]);

MACHINE.DB.OutputTray =
MACHINE.DB.CopyOutputTray =
MACHINE.DB.FaxOutputTray = new SWS.UTIL.DataArray([
	[LN.Bin1 ,			0x00000001],
	[LN.Bin2,			0x00000002],
	[LN.Bin3,			0x00000004],
	[LN.Bin4,			0x00000008],
	[LN.Bin5 ,			0x00000010],
	[LN.Bin6,			0x00000020],
	[LN.TopBin,			0x00000040],
	[LN.StandardBin ,	0x00000080],
	[LN.InnerBin,		0x00000100],
	[LN.FinishingBin,		0x00000200]
]);

MACHINE.DB.duplex = new SWS.UTIL.DataArray([
	[LN.Off,					0x00000001],
	[_T("%%Long Edge%%"),			0x00000002],
	[_T("%%Short Edge%%"),			0x00000004]
]);

MACHINE.DB.resolution = new SWS.UTIL.DataArray([
	[_T("%%Draft%%"),			0x00000001], //300 dpi - Draft
	[_T("%%Standard%%"),		0x00000002], //600 dpi - Normal  --> Standard
	[_T("%%High Resolution%%"),			0x00000004], //1200 dpi - Best  ---> High Resolution 
	[_T("%%Res1200Fast%%"),				0x00000008],
	[_T("%%Res1200Best%%"),				0x00000010],		
	[_T("%%Draft%%"),		    		0x00000020],            
	[_T("%%Draft%%"),			0x00000040],    //600 dpi -  Draft       
	[_T("%%Normal%%"),					0x00000080],
	[_T("%%Best%%"),		    		0x00000100]
]);
MACHINE.DB.darkness = new SWS.UTIL.DataArray([
	[_T("%%Light%%"),		0x00000001],
	[_T("%%Normal%%"),			0x00000002],
	[_T("%%Dark%%"),			0x00000004]
]);
MACHINE.DB.fineEdge = new SWS.UTIL.DataArray([
	[_T("%%Off%%"),			0x00000001],
	[_T("%%Minimum%%"),		0x00000002],
	[_T("%%Normal%%"),		0x00000004],
	[_T("%%Maximum%%"),		0x00000008]	
]);
MACHINE.DB.edgeEnhance = new SWS.UTIL.DataArray([
	[_T("%%Off%%"),			0x00000001],
	[_T("%%Normal%%"),		0x00000002],
	[_T("%%Maximum%%"),		0x00000004]	
]);

MACHINE.DB.trapping = new SWS.UTIL.DataArray([
	[_T("%%Off%%"),			0x00000001],
	[_T("%%Minimum%%"),		0x00000002],
	[_T("%%Medium%%"),		0x00000004],
	[_T("%%Maximum%%"),		0x00000008]	
]);

MACHINE.DB.darkenText = new SWS.UTIL.DataArray([
	[_T("%%Off%%"),			0x00000001],
	[_T("%%Minimum%%"),		0x00000008],
	[_T("%%Normal%%"),		0x00000002],
	[_T("%%Maximum%%"),		0x00000004]
]);

MACHINE.DB.screen = new SWS.UTIL.DataArray([
	[_T("%%Normal%%"),			0x00000001],
	[_T("%%Enhanced%%"),		0x00000002],
	[_T("%%Detailed%%"),		0x00000004]
]);

MACHINE.DB.density = new SWS.UTIL.DataArray([
	[_T("%%Light%%"),				0x00000001],
	[_T("%%Normal%%"),			0x00000002],
	[_T("%%Dark%%"),				0x00000004]
]);

/* If you change MACHINE.DB.paperType, you MUST change MACHINE.DB.NoEnglishPaperType also.*/
MACHINE.DB.paperType = new SWS.UTIL.DataArray([
	[LN.Off,								0x00000001],
	[_T("%%Plain%%"),						0x00000002],
	[_T("%%Mid-Weight 96-110g%%"),			0x00000004],
	[_T("%%Light 60-74g%%"),				0x00000008],
	[_T("%%Bond%%"),						0x00000010],
	[_T("%%Color%%"),						0x00000020],
	[_T("%%Extra Heavy 121-163g%%"),		0x00000040],	
	[_T("%%Labels%%"),						0x00000080],
	[_T("%%Transparency%%"),				0x00000100],
	[_T("%%Envelope%%"),					0x00000200],
	[_T("%%Preprinted%%"),					0x00000400],
	[_T("%%HP LaserJet 90g%%"),				0x00000800],
	[_T("%%Recycled%%"),					0x00001000],
	[_T("%%LetterHead%%"),					0x00002000],
	[_T("%%Special%%"),						0x00004000],
	[_T("%%Heavy weight%%"),				0x00008000],
	[_T("%%Punched%%"),						0x00010000],
	[_T("%%Intermediate 85-95g%%"),			0x00020000],
	[LN.Custom + " 1",						0x00040000],
	[_T("%%Thin CardStock%%"),				0x00080000],
	[_T("%%Thick CardStock%%"),				0x00100000],
	[_T("%%Thin Glossy%%"),					0x00200000],
	[_T("%%Postcard%%"),					0x08000000],
	[_T("%%Cardstock 176-220g%%"),			0x10000000],
	[_T("%%Extra Thick%%"),					0x20000000],
	[_T("%%High Coverage%%"),				0x40000000],
	[_T("%%Glossy Photo 111-130 g/m2%%"), 	0x100000000],
	[_T("%%Glossy Photo 131-175 g/m2%%"), 	0x200000000],
	[_T("%%Glossy Photo 176-220 g/m2%%"), 	0x400000000],
	[_T("%%Matte Photo 111-130 g/m2%%"), 	0x800000000],
	[_T("%%Matte Photo 131-175 g/m2%%"), 	0x1000000000],
	[_T("%%Matte Photo 176-220 g/m2%%"), 	0x2000000000]
]);

MACHINE.DB.NoEnglishPaperType = new SWS.UTIL.DataArray([
	[LN.Off,								0x00000001],
	[_T("%%Plain%%"),						0x00000002],
	[_T("%%Mid-Weight 96-110g%%"),			0x00000004],
	[_T("%%Light 60-74g%%"),				0x00000008],
	[_T("%%Bond%%"),						0x00000010],
	[_T("%%Color Paper%%"),					0x00000020],
	[_T("%%Extra Heavy 121-163g%%"),		0x00000040],	
	[_T("%%Labels%%"),						0x00000080],
	[_T("%%Transparency%%"),				0x00000100],
	[_T("%%Envelope%%"),					0x00000200],
	[_T("%%Preprinted%%"),					0x00000400],
	[_T("%%HP LaserJet 90g%%"),				0x00000800],
	[_T("%%Recycled%%"),					0x00001000],
	[_T("%%LetterHead%%"),					0x00002000],
	[_T("%%Special%%"),						0x00004000],
	[_T("%%Heavy weight%%"),				0x00008000],
	[_T("%%Punched%%"),						0x00010000],
	[_T("%%Intermediate 85-95g%%"),			0x00020000],
	[LN.Custom + " 1",						0x00040000],
	[_T("%%Thin CardStock%%"),				0x00080000],
	[_T("%%Thick CardStock%%"),				0x00100000],
	[_T("%%Thin Glossy%%"),					0x00200000],
	[_T("%%Postcard%%"),					0x08000000],
	[_T("%%Cardstock 176-220g%%"),			0x10000000],
	[_T("%%Extra Thick%%"),					0x20000000],
	[_T("%%High Coverage%%"),				0x40000000],
	[_T("%%Glossy Photo 111-130 g/m2%%"),	0x100000000],
	[_T("%%Glossy Photo 131-175 g/m2%%"),	0x200000000],
	[_T("%%Glossy Photo 176-220 g/m2%%"),	0x400000000],
	[_T("%%Matte Photo 111-130 g/m2%%"),	0x800000000],
	[_T("%%Matte Photo 131-175 g/m2%%"),	0x1000000000],
	[_T("%%Matte Photo 176-220 g/m2%%"),	0x2000000000]
]);

MACHINE.DB.emulation = new SWS.UTIL.DataArray([
	[LN.Auto,					0x00000001],
	[_T("%%PCL5E%%"),			0x00000002],
	[_T("%%PCL4%%"),			0x00000004],
	[_T("%%WPS3%%"),			0x00000008],
	[_T("%%WPS6%%"),			0x00000010],
	[_T("%%KSC5843%%"),			0x00000020],
	[_T("%%KSSM%%"),			0x00000040],
	[_T("%%KSC5895%%"),			0x00000080],
	[_T("%%HWP%%"),				0x00000100],
	[_T("%%PCLXL%%"),			0x00000200],
	[_T("%%PS%%"),				0x00000400],
	[_T("%%HEXDUMP%%"),			0x00000800],
	[_T("%%EPSON%%"),			0x00001000],
	[_T("%%PS3 SW Render%%"),	0x00002000],
	[_T("%%Color GDI%%"),		0x00008000],
//	[_T("%%QPDL%%"),			0x00010000],	SWS can not select QPDL option by spec. 
	[_T("%%IBM ProPrint%%"),	0x00020000],
	[_T("%%PCL%%"),				0x00040000],
	[_T("%%PostScript%%"),		0x00004000],	
	[_T("%%PDF%%"),				0x00080000],
	[_T("%%TIFF%%"),			0x00100000],
	[_T("%%XPS%%"),				0x00200000],
	[_T("%%XPI%%"),				0x00400000]
]);

MACHINE.DB.tarySwitch = new SWS.UTIL.DataArray([
	[LN.Off ,				0x00000001],
	[LN.On ,				0x00000002],
	[_T("%%Tray1 -> Tray2%%"),	0x00000004],
	[_T("%%Tray2 -> Tray1%%"),	0x00000008]
]);

MACHINE.DB.lowPowerSave =
MACHINE.DB.powerSave = new SWS.UTIL.DataArray([
	[LN.Off ,					0x00000001],
	["1 " + LN.minute,			0x00000400],	
	["5 " + LN.minutes,			0x00000002],
	["10 " + LN.minutes,		0x00000004],
	["15 " + LN.minutes,		0x00000008],
	["20 " + LN.minutes,		0x00000100],
	["30 " + LN.minutes,		0x00000010],
	["45 " + LN.minutes,		0x00000020],
	["60 " + LN.minutes,		0x00000040],
	["120 " + LN.minutes,		0x00000080]
]);

MACHINE.DB.scanPowerSave = new SWS.UTIL.DataArray([
		["0.5 " + LN.hours,		0x00000001],
		["1 " + LN.hours,			0x00000002],
		["2 " + LN.hours,			0x00000020],				
		["4 " + LN.hours,			0x00000004],
		["8 " + LN.hours,			0x00000008],
		["12 " + LN.hours,			0x00000010]
]);

MACHINE.DB.systemTimeOut = new SWS.UTIL.DataArray([
		[LN.Off,				0],		
		["1 " + LN.minutes,		1],
		["2 " + LN.minutes,		2],
		["3 " + LN.minutes,		3],
		["4 " + LN.minutes,		4],
		["5 " + LN.minutes,		5],					
		["6 " + LN.minutes,		6],
		["7 " + LN.minutes,		7],
		["8 " + LN.minutes,		8],
		["9 " + LN.minutes,		9],					
		["10 " + LN.minutes,	10]
]);

MACHINE.DB.machineTimeOut = new SWS.UTIL.DataArray([
		[LN.Off,				0x00000001],		
		["15 " + LN.TimeoutSecond_s,		0x00000002],
		["30 " + LN.TimeoutSecond_s,		0x00000004],
		["60 " + LN.TimeoutSecond_s,		0x00000008],
		["120 " + LN.TimeoutSecond_s,		0x00000010],
		["180 " + LN.TimeoutSecond_s,		0x00000020]					
]);

MACHINE.DB.imgUnitStop =
MACHINE.DB.imgUnitLowAlert = 
MACHINE.DB.tonerSave = 
MACHINE.DB.jamRecovery = 
MACHINE.DB.tonerSave =
MACHINE.DB.tonerLowAlert = 
MACHINE.DB.quietMode = 
MACHINE.DB.buttonPress = 
MACHINE.DB.Scanner = 
MACHINE.DB.Printer = 
MACHINE.DB.usbHost =
MACHINE.DB.autoCont =
MACHINE.DB.transferBeltUnitReorderNotification =
MACHINE.DB.transferBeltCleaningUnitReorder =
MACHINE.DB.transferRollerReorderNotification =
MACHINE.DB.fuserUnitReorderNotification =
MACHINE.DB.colorDensityControl = MACHINE.DB.machineOnOff;


MACHINE.DB.tonerOut = new SWS.UTIL.DataArray([
	[_T("%%Continue%%"),		0x00000001],
	[_T("%%Stop%%"),			0x00000002]
]);

MACHINE.DB.altitude = new SWS.UTIL.DataArray([
	[_T("%%Normal%%"),			0x00000001],
	[_T("%%High 1%%"),			0x00000002],
	[_T("%%High 2%%"),			0x00000004],
	[_T("%%High 3%%"),			0x00000008],
	[_T("%%High 4%%"),			0x00000010]
]);

MACHINE.DB.Humidity = new SWS.UTIL.DataArray([
	[_T("%%Normal%%"),			0x00000001],
	[_T("%%High1%%"),			0x00000002],
	[_T("%%High2%%"),			0x00000004],
	[_T("%%High3%%"),			0x00000008]
]);

MACHINE.DB.standardPaperSize = new SWS.UTIL.DataArray([
	[_T("%%A4%%"),				0x00000001],
	[_T("%%Letter%%"),			0x00000002]
]);

MACHINE.DB.pdfFormat = new SWS.UTIL.DataArray([
	[_T("%%Standard%%"),		0x00000001],
	[_T("%%PDF/A%%"),			0x00000002]
]);

MACHINE.DB.autoCR = new SWS.UTIL.DataArray([
	[_T("%%LF%%"),				0x00000001],
	[_T("%%LF+CR%%"),			0x00000002]
]); 

MACHINE.DB.portActivation = 
MACHINE.DB.alarmShortage = MACHINE.DB.machineOnOff;

MACHINE.DB.colorCalibration = new SWS.UTIL.DataArray([
	[_T("%%Off%%"),				0x00000001],
	[_T("%%Auto%%"),			0x00000002],
	[_T("%%Run Now%%"),			0x00000004]
]);

MACHINE.DB.colorTone = new SWS.UTIL.DataArray([
	[_T("%%Auto%%"),			0x00000001],
	[_T("%%Vivid%%"),			0x00000002],
	[_T("%%Glossy%%"),			0x00000004],
	[_T("%%Natural%%"),			0x00000008]
]);

MACHINE.DB.colorMode = new SWS.UTIL.DataArray([
	[_T("%%RGB Image%%"),		    0x00000001],
	[_T("%%RGB Text%%"),			0x00000002],
	[_T("%%RGB Graphics%%"),		0x00000004],
	[_T("%%CMYK Image%%"),		    0x00000008],
	[_T("%%CMYK Text%%"),			0x00000010],
	[_T("%%CMYK Graphics%%"),		0x00000020]
]);

MACHINE.DB.colorBlue =
MACHINE.DB.colorGreen =
MACHINE.DB.colorRed = new SWS.UTIL.DataArray([
	["-2",				0x00000001],
	["-1",				0x00000002],
	["0",				0x00000004],
	["1",				0x00000008],
	["2",				0x00000010]
]);


MACHINE.DB.colorYellow = 
MACHINE.DB.colorMagenta = 
MACHINE.DB.colorBlack = 
MACHINE.DB.colorCyan = new SWS.UTIL.DataArray([
	["-10",				0x00000001],
	["-9",				0x00000002],
	["-8",				0x00000004],
	["-7",				0x00000008],
	["-6",				0x00000010],
	["-5",				0x00000020],
	["-4",				0x00000040],
	["-3",				0x00000080],
	["-2",				0x00000100],
	["-1",				0x00000200],
	["0",				0x00000400], 
	["1",				0x00000800], 	
	["2",				0x00001000],
	["3",				0x00002000],
	["4",				0x00004000], 
	["5",				0x00008000],
	["6",				0x00010000],
	["7",				0x00020000],
	["8",				0x00040000], 
	["9",				0x00080000],
	["10",				0x00100000]
]);


MACHINE.DB.colorCMYK = new SWS.UTIL.DataArray([
	[_T("%%Default%%"),			    0x00000001],
	[_T("%%Manual Adjust%%"),		0x00000002]
]);

MACHINE.DB.wideA4 =
MACHINE.DB.usbPortEnable =
MACHINE.DB.parallelPortEnable = MACHINE.DB.machineOnOff;

/* Sound/Volume */

MACHINE.DB.speaker = new SWS.UTIL.DataArray([
	[_T("%%Off%%"),			    0x00000001],
	[_T("%%On%%"),				0x00000002],
	[_T("%%Comm.%%"),				0x00000004]
]);

MACHINE.DB.ringer = new SWS.UTIL.DataArray([
	[_T("%%Off%%"),			    0x00000001],
	[_T("%%Low%%"),				0x00000002],
	[_T("%%Mid%%"),				0x00000004],
	[_T("%%High%%"),			0x00000008]
]);

MACHINE.DB.KeySpeakerVolume = 
MACHINE.DB.FaxDialToneVolume = 
MACHINE.DB.FaxRingVolume = new SWS.UTIL.DataArray([
	["1",			      1],
	["2",				2],
	["3",				3],
	["4",				4],
	["5",				5],
	["6",				6],
	["7",				7]
]);
MACHINE.DB.buttonNotice = new SWS.UTIL.DataArray([
	["1",				0x00000002],
	["2",				0x00000004],
	["3",				0x00000008],
	["4",				0x00000010],
	["5",				0x00000020],
	["6",				0x00000040],
	["7",				0x00000080]	
]);

/* PCL */
MACHINE.DB.pclTypeFace = new SWS.UTIL.DataArray([
	["PCL1(NimbusMono)",		1,  0x00000000000000000000000000000001],
	["PCL2(NimbusMono    Bd)",	2,  0x00000000000000000000000000000002],
	["PCL3(NimbusMono    It)",	3,  0x00000000000000000000000000000004],
	["PCL4(NimbusMono  BdIt)",	4,  0x00000000000000000000000000000008],
	["PCL5(LetterGothic)",		5,  0x00000000000000000000000000000010],
	["PCL6(LetterGothic  Bd)",	6,  0x00000000000000000000000000000020],
	["PCL7(LetterGothic  It)",	7,  0x00000000000000000000000000000040],

	["PCL8(NimbusRomNo4)",		8,  0x00000000000000000000000000000080],
	["PCL9(NimbusRomNo4  Bd)",      9,  0x00000000000000000000000000000100],
	["PCL10(NimbusRomNo4  It)",	10,  0x00000000000000000000000000000200],
	["PCL11(NimbusRomNo4  BI)",	11,  0x00000000000000000000000000000400],
	["PCL12(URW Classico)",		12,  0x00000000000000000000000000000800],
	["PCL13(URW Classico  Bd)",	13,  0x00000000000000000000000000001000],
	["PCL14(URW Classico  It)",	14,  0x00000000000000000000000000002000],
	["PCL15(URWClassico BdIt)",	15,  0x00000000000000000000000000004000],
	["PCL16(URW C093)",			16,  0x00000000000000000000000000008000],
	["PCL17(URWC011     CdBd)",	17,  0x00000000000000000000000000010000],
	["PCL18(ClassicSans   Rg)",	18,  0x00000000000000000000000000020000],
	["PCL19(ClassicSans   Bd)",	19,  0x00000000000000000000000000040000],
	["PCL20(ClassicSans   It)",	20,  0x00000000000000000000000000080000],
	["PCL21(ClassicSans BdIt)",	21,  0x00000000000000000000000000100000],

	["PCL22(Antique    Olive)",	22,  0x00000000000000000000000000200000],
	["PCL23(Antique Olive Bd)",	23,  0x00000000000000000000000000400000],
	["PCL24(Antique Olive It)",	24,  0x00000000000000000000000000800000],
	["PCL25(Garamond Antiqua)",	25,  0x00000000000000000000000001000000],
	["PCL26(Garamond     Hlb)",	26,  0x00000000000000000000000002000000],
	["PCL27(Garamond    Krsv)",	27,  0x00000000000000000000000004000000],
	["PCL28(Garamond KrsvHlb)",	28,  0x00000000000000000000000008000000],

	["PCL29(Algiers       Md)",	29,  0x00000000000000000000000010000000],
	["PCL30(Algiers       Xb)",	30,  0x00000000000000000000000020000000],

	["PCL31(NimbusSansNo2)",	31,  0x00000000000000000000000040000000],
	["PCL32(NimbusSansNo2 Bd)",	32,  0x00000000000000000000000080000000],
	["PCL33(NimbusSansNo2 It)",	33,  0x00000000000000000000000100000000],
	["PCL34(NimbusSansNo2 BI)",	34,  0x00000000000000000000000200000000],
	["PCL35(NimbusRomNo9  Rg)",	35,  0x00000000000000000000000400000000],
	["PCL36(NimbusRomNo9  Bd)",	36,  0x00000000000000000000000800000000],
	["PCL37(NimbusRomNo9  It)",	37,  0x00000000000000000000001000000000],
	["PCL38(NimbusRomNo9  BI)",	38,  0x00000000000000000000002000000000],

	["PCL39(Symbol)",		39,  0x00000000000000000000004000000000],
	["PCL40(URW Dings)",	        40,  0x00000000000000000000008000000000],

	["PCL41(Line Printer 8U)",	41,  0x00000000000000000000010000000000],
	["PCL42(Line Printer 0N)",	42,  0x00000000000000000000020000000000],
	["PCL43(Line Printer 10U)",	43,  0x00000000000000000000040000000000],
	["PCL44(Line Printer 11U)",	44,  0x00000000000000000000080000000000],
	["PCL45(Line Printer 12U)",	45,  0x00000000000000000000100000000000],
	["PCL46(Line Printer 1U)",	46,  0x00000000000000000000200000000000],
	["PCL47(Line Printer 2N)",	47,  0x00000000000000000000400000000000],
	["PCL48(Line Printer 5N)",	48,  0x00000000000000000000800000000000],
	["PCL49(Line Printer 6N)",	49,  0x00000000000000000001000000000000],
	["PCL50(OCR-A)",		50,  0x00000000000000000002000000000000],
	["PCL51(OCR-B)",		51,  0x00000000000000000004000000000000],
	["PCL52(HebTypRd)",		52,  0x00000000000000000008000000000000],
	["PCL53(HebTypRd      Bd)",	53,  0x00000000000000000010000000000000],
	["PCL54(HebTypRd      It)",	54,  0x00000000000000000020000000000000],
	["PCL55(HebTypSer)",		55,  0x00000000000000000040000000000000],
	["PCL56(HebTypSer     Bd)",	56,  0x00000000000000000080000000000000],
	["PCL57(HebTypSans)",		57,  0x00000000000000000100000000000000],
	["PCL58(HebTypSans    Bd)",	58,  0x00000000000000000200000000000000],
	["PCL59(SPS David)",		59,  0x00000000000000000400000000000000],
	["PCL60(SPS David Bold)",	60,  0x00000000000000000800000000000000]
	
]);
MACHINE.DB.pclSymbolSet = new SWS.UTIL.DataArray([
	["Roman-8",			1, 0x0000000000000001],
	["DeskTop",			2, 0x0000000000000002],
	["ISO 8859/1 Latin 1",		3, 0x0000000000000004],
	["ISO 8859/2 Latin 2",		4, 0x0000000000000008],
	["ISO 8859/9 Latin 5",		5, 0x0000000000000010],
	["ISO 8859/10 Latin 6", 	6, 0x0000000000000020],
	["MC Text",			7, 0x0000000000000040],
	["Math-8",			8, 0x0000000000000080],
	["Microsoft Publishing",	9, 0x0000000000000100],
	["Pi Font",			10, 0x0000000000000200],
	["PS Math",			11, 0x0000000000000400],
	["PS Text",			12, 0x0000000000000800],
	["Ventura International",	13, 0x0000000000001000],
	["Ventura Math",		14, 0x0000000000002000],
	["Ventura US",			15, 0x0000000000004000],
	["Windows 3.0 Latin 1",		16, 0x0000000000008000],
	["Windows 3.1 Latin 1",		17, 0x0000000000010000],
	["Windows 3.1 Latin 2",		18, 0x0000000000020000],
	["Windows 3.1 Latin 5",		19, 0x0000000000040000],
	["Windows Baltic",		20, 0x0000000000080000],
	["Symbol",			21, 0x0000000000100000],
	["Wingding",			22, 0x0000000000200000],
	["Legal",			23, 0x0000000000400000],
	["ISO 4",			24, 0x0000000000800000],
	["ISO 6",			25, 0x0000000001000000],
	["ISO 11",			26, 0x0000000002000000],
	["ISO 15",			27, 0x0000000004000000],
	["ISO 17",			28, 0x0000000008000000],
	["ISO 21",			29, 0x0000000010000000],
	["ISO 60",			30, 0x0000000020000000],
	["ISO 69",			31, 0x0000000040000000],
	["PC-775",			32, 0x0000000080000000],
	["PC-1004",			33, 0x0000000100000000],
	["PC-8",			34, 0x0000000200000000],
	["PC-8DN",			35, 0x0000000400000000],
	["PC-850",			36, 0x0000000800000000],
	["PC-852",			37, 0x0000001000000000],
	["PC-8TK",			38, 0x0000002000000000],
	["ISO 8859/5 Latin Cyrillic",	39, 0x0000004000000000],
	["CP866",			40, 0x0000008000000000],
	["Hebrew 15Q",			41, 0x0000010000000000],
	["Hebrew-8",			42, 0x0000020000000000],
	["Hebrew-7",			43, 0x0000040000000000],
	["ISO 8859/7 Latin Greek",	44, 0x0000080000000000],
	["PC-8 Latin/Greek",		45, 0x0000100000000000],
	["OCR-A",			46, 0x0000200000000000],
	["OCR-B",			47, 0x0000400000000000],

	["PC-858",			48, 0x0000800000000000],
	["ISO 8859/15 Latin 9", 	49, 0x0001000000000000]
]); 
MACHINE.DB.courier = new SWS.UTIL.DataArray([
	[_T("%%Regular%%"),			0x00000001],
	[_T("%%Dark%%"),			0x00000002]
]);

MACHINE.DB.autoCR = new SWS.UTIL.DataArray([
	[_T("%%LF%%"),		0x00000001],
	[_T("%%LF + CR%%"),	0x00000002]
]);



// PS Menu DB
MACHINE.DB.psError = MACHINE.DB.machineOnOff;

/* Copy */
MACHINE.DB.copyReduce = new SWS.UTIL.DataArray([
	[_T("%%Original(100%)%%"),			0x00000001],
	[_T("%%Auto Fit%%"),					0x00001000],
	[_T("%%25%%%"),						0x00000080],
	[_T("%%50%%%"),						0x00000100],
	[_T("%%(50%)A3->A5%%"),			0x00002000],
	[_T("%%(61%)A3->B5%%"),			0x00008000],
	[_T("%%(64%)Ledger->LTR%%"),	0x00020000],
	[_T("%%(70%)A3->A4%%"),			0x00080000],	
	[_T("%%(70%)B4->B5%%"),			0x00040000],
	[_T("%%(70%)A4->A5%%"),			0x00000008],
	[_T("%%(77%)Ledger->LGL%%"),	0x00100000],
	[_T("%%(78%)LGL->LTR%%"),			0x00000002],
	[_T("%%(81%)B5->A5%%"),			0x00200000],
	[_T("%%(81%)B4->A4%%"),			0x00400000],
	[_T("%%(83%)LGL->A4%%"),			0x00000004],	
	[_T("%%(86%)A3->B4%%"),			0x00800000],
	[_T("%%(86%)A4->B5%%"),			0x00004000],	
	[_T("%%(94%)A4->LTR%%"),			0x00000010],    
	[_T("%%(104%)EXE->LTR%%"),		0x00000020],
	[_T("%%(115%)B4->A3%%"),			0x01000000],
	[_T("%%(115%)B5->A4%%"),			0x00010000],	
	[_T("%%(121%)LGL->Ledger%%"),		0x02000000],
	[_T("%%(122%)A4->B4%%"),			0x04000000],
	[_T("%%(129%)LTR->Ledger%%"),		0x08000000],
	[_T("%%(141%)A4->A3%%"),			0x20000000],
	[_T("%%(141%)A5->A4%%"),			0x00000040],
	[_T("%%150%%%"),					0x00000200],
	[_T("%%(200%)A5->A3%%"),			0x40000000],	
	[_T("%%200%%%"),					0x00000400],
	[_T("%%400%%%"),					0x00000800],
	[_T("%%Custom(25%~400%)%%"),	0x10000000]
]);

MACHINE.DB.OriginalBinding  = 
MACHINE.DB.OutputBinding = new SWS.UTIL.DataArray([
	[_T("%%Book%%"),			0x00000001],
	[_T("%%Calendar%%"),			0x00000002]
]);

MACHINE.DB.CopyColorMode = new SWS.UTIL.DataArray([
	[_T("%%Auto%%"),				0x00000001],	
	[_T("%%Color%%"),		0x00000002],
	[_T("%%Mono%%"),				0x00000004]
]);

MACHINE.DB.copyDarkness = new SWS.UTIL.DataArray([
	[_T("%%Lightest%%"),			0x00000008],
	[_T("%%Light%%"),				0x00000001],
	[_T("%%Normal%%"),				0x00000002],
	[_T("%%Dark%%"),				0x00000004],
	[_T("%%Darkest%%"),				0x00000010]
]);

MACHINE.DB.ScanOriginalOrientation = 
MACHINE.DB.FaxOriginalOrientation = 
MACHINE.DB.copyOriginalOrientation = new SWS.UTIL.DataArray([
	[_T("%%Upright images%%"),				0x00000001],
	[_T("%%Sideways images%%"),				0x00000002]
]);

MACHINE.DB.copyOriginalFullOption = new SWS.UTIL.DataArray([
	[_T("%%Text%%"),						0x00000001],
	[_T("%%Text/Photo%%"),				0x00000002],
	[_T("%%Photo%%"),					0x00000004],
	[_T("%%Magazine%%"),				0x00000008],
	[_T("%%Copied Original%%"),			0x00000010],
	[_T("%%Text & Glossy Photo%%"),		0x00000020],
	[_T("%%Newspaper%%"),				0x00000040],
	[_T("%%Glossy Photo%%"),				0x00000080],
	[_T("%%Map%%"),						0x00000100],
	[_T("%%Light Original%%"),				0x00000200]
]);

MACHINE.DB.copyOriginal = new SWS.UTIL.DataArray([
	[_T("%%Text%%"),						0x00000001],
	[_T("%%Text/Photo%%"),				0x00000002],
	[_T("%%Photo%%"),					0x00000004],
	[_T("%%Magazine%%"),				0x00000008],
	[_T("%%Copied Original%%"),			0x00000010],
	[_T("%%Map%%"),						0x00000100],
	[_T("%%Light Original%%"),				0x00000200]
]);


MACHINE.DB.copyOriginalTextPhoto = new SWS.UTIL.DataArray([
	[_T("%%Text & Printed Photo%%"),		0x00000002],  //Same as Tex/Photo
	[_T("%%Text & Glossy Photo%%"),		0x00000020],
	[_T("%%Newspaper%%"),				0x00000040]
]);

MACHINE.DB.copyOriginalPhoto = new SWS.UTIL.DataArray([
	[_T("%%Printed Photo%%"),				0x00000004],	 //Same as Photo
	[_T("%%Glossy Photo%%"),				0x00000080]
]);

MACHINE.DB.copyOutputSort = new SWS.UTIL.DataArray([
	[_T("%%Collated%%"),			0x00000002],
	[_T("%%Uncollated%%"),				0x00000001]
]);

MACHINE.DB.ScanOriginalSizeA3 =
MACHINE.DB.FaxOriginalSizeA3 =
MACHINE.DB.copyOriginalSizeA3 = new SWS.UTIL.DataArray([
	[_T("%%Auto%%"),						0x00000001],
	[_T("%%A3%%"),					0x00000002],
	[_T("%%A4 LEF%%"),				0x00000004],
	[_T("%%A4 SEF%%"),				0x00000008],
	[_T("%%A5 LEF%%"),				0x00000010],
	[_T("%%A5 SEF%%"),				0x00000020],
	[_T("%%B4%%"),				0x00000040],
	[_T("%%B5(JIS) LEF %%"),			0x00000080],
	[_T("%%B5(JIS) SEF%%"),			0x00000100],
	[_T("%%Letter SEF%%"),				0x00000200],
	[_T("%%Letter LEF%%"),				0x00000400],
	[_T("%%Legal SEF%%"),				0x00000800],
	[_T("%%Ledger%%"),				0x00001000],
	[_T("%%Statement SEF%%"),			0x00002000],
	[_T("%%Statement LEF%%"),			0x00004000],	
	[_T("%%Folio SEF%%"),				0x00008000],
	[_T("%%Executive SEF%%"),			0x00010000],	
	[_T("%%Executive LEF%%"),			0x00020000],    
	[_T("%%Oficio SEF%%"),				0x00080000]
]);

MACHINE.DB.ScanOriginalSizeA4 =
MACHINE.DB.FaxOriginalSizeA4 =
MACHINE.DB.copyOriginalSizeA4 = new SWS.UTIL.DataArray([
	[_T("%%Auto%%"),						0x00000001],
	[_T("%%A3%%"),					0x00000002],
	[_T("%%A4 LEF%%"),				0x00000004],
	[_T("%%A4%%"),					0x00000008],
	[_T("%%A5 LEF%%"),				0x00000010],
	[_T("%%A5%%"),					0x00000020],
	[_T("%%B4%%"),					0x00000040],
	[_T("%%B5(JIS) LEF%%"),			0x00000080],
	[_T("%%B5(JIS)%%"),				0x00000100],
	[_T("%%Letter%%"),				0x00000200],
	[_T("%%Letter LEF%%"),			0x00000400],
	[_T("%%Legal%%"),				0x00000800],
	[_T("%%Ledger%%"),				0x00001000],
	[_T("%%Executive%%"),			0x00010000],	
	[_T("%%Executive LEF%%"),		0x00020000],    	
	[_T("%%Oficio 8.5x13%%"),				0x00008000],	
	[_T("%%Oficio 216x340mm%%"),			0x00080000],		
	[_T("%%Statement%%"),			0x00002000],
	[_T("%%Statement LEF%%"),		0x00004000]		
]);


/* Fax General */
MACHINE.DB.FaxResolution = new SWS.UTIL.DataArray([
	[_T("%%Standard%%"),				0x00000001],
	[_T("%%Fine%%"),					0x00000002],
	[_T("%%Super Fine%%"),				0x00000004],
	[_T("%%Photo Fax%%"),				0x00000008],
	[_T("%%Color Fax%%"),				0x00000010],
	[_T("%%Ultra Fine%%"),				0x00000020] 
	
]);

MACHINE.DB.FaxDarkness = new SWS.UTIL.DataArray([
	[_T("%%Lightest%%"),				0x00000008],
	[_T("%%Light%%"),					0x00000001],
	[_T("%%Normal%%"),					0x00000002],
	[_T("%%Dark%%"),					0x00000004],
	[_T("%%Darkest%%"),					0x00000010]
]);

MACHINE.DB.FaxOriginalType = new SWS.UTIL.DataArray([
	[_T("%%Text%%"),				0x00000001],
	[_T("%%Text/Photo%%"),		0x00000002],
	[_T("%%Photo%%"),			0x00000004]
]);

MACHINE.DB.FaxColorMode = new SWS.UTIL.DataArray([
	[_T("%%Mono%%"),				0x00000001],
	[_T("%%Color%%"),					0x00000002]
]);


MACHINE.DB.FaxSecureRcv = new SWS.UTIL.DataArray([
	[LN.Off,				0x00000000],
	[LN.On,					0x00000001]
]);

MACHINE.DB.FaxRedialTimes = new SWS.UTIL.DataArray([
	["0 " + LN.times,			0x00000001],
	["1 " + LN.times,			0x00000002],
	["2 " + LN.times,			0x00000004],
	["3 " + LN.times,			0x00000008],
	["4 " + LN.times,			0x00000010],
	["5 " + LN.times,			0x00000020],
	["6 " + LN.times,			0x00000040],
	["7 " + LN.times,			0x00000080],
	["8 " + LN.times,			0x00000100],
	["9 " + LN.times,			0x00000200],
	["10 " + LN.times,			0x00000400],
	["11 " + LN.times,			0x00000800],
	["12 " + LN.times,			0x00001000],
	["13 " + LN.times,			0x00002000]	
]);
MACHINE.DB.FaxRedialTerm = new SWS.UTIL.DataArray([
	["1 " + LN.minute,			0x00000001],
	["2 " + LN.minutes,			0x00000002],
	["3 " + LN.minutes,			0x00000004],
	["4 " + LN.minutes,			0x00000008],
	["5 " + LN.minutes,			0x00000010],
	["6 " + LN.minutes,			0x00000020],
	["7 " + LN.minutes,			0x00000040],
	["8 " + LN.minutes,			0x00000080],
	["9 " + LN.minutes,			0x00000100],
	["10 " + LN.minutes,		0x00000200],
	["11 " + LN.minutes,		0x00000400],
	["12 " + LN.minutes,			0x00000800],
	["13 " + LN.minutes,			0x00001000],
	["14 " + LN.minutes,			0x00002000],
	["15 " + LN.minutes,			0x00004000]
]);

MACHINE.DB.FaxMultiSendConfirm = 
MACHINE.DB.FaxRecvFwdConfirm = 
MACHINE.DB.FaxSendFwdConfirm =
MACHINE.DB.FaxSendReport = new SWS.UTIL.DataArray([	
	[LN.Off,						0x00000001],
	[LN.On,							0x00000002],
	[_T("%%On-Error%%"),			0x00000004]
]);

MACHINE.DB.FaxRxMode = new SWS.UTIL.DataArray([
	[_T("%%Telephone%%"),			0x00000001],
	[_T("%%Fax%%"),			0x00000002],
	[_T("%%Telephone/Fax%%"),		0x00000004],
	[_T("%%Answering Machine/Fax%%"),		0x00000008], 
	[_T("%%DRPD%%"),		0x00000010]
]);

MACHINE.DB.FaxRingsToAns = new SWS.UTIL.DataArray([
	["1 " + LN.times,			0x00000001],
	["2 " + LN.times,			0x00000002],
	["3 " + LN.times,			0x00000004],
	["4 " + LN.times,			0x00000008],
	["5 " + LN.times,			0x00000010],
	["6 " + LN.times,			0x00000020],
	["7 " + LN.times,			0x00000040]
]);

MACHINE.DB.FaxRcvStCd = new SWS.UTIL.DataArray([
	[0,		0x00000001],
	[1,					0x00000002],
	[2,					0x00000004],
	[3,					0x00000008],
	[4,					0x00000010],
	[5,					0x00000020],
	[6,					0x00000040],
	[7,					0x00000080],
	[8,					0x00000100],
	[9,					0x00000200]
]);

MACHINE.DB.FaxDuplex = new SWS.UTIL.DataArray([
	[LN.Off,			0x00000001],
	[_T("%%Long Edge%%"),		0x00000002],
	[_T("%%Short Edge%%"),		0x00000004]
]);

MACHINE.DB.FaxDialType = new SWS.UTIL.DataArray([
	[_T("%%Tone%%"),		0x00000001],
	[_T("%%Pulse%%"),		0x00000002]
]);

MACHINE.DB.ScanDefDuplex = 
MACHINE.DB.FaxDefDuplex = new SWS.UTIL.DataArray([
	[_T("%%1 Sided%%"),			0x00000001],
	[_T("%%2 Sided, Book%%"),		0x00000002],
	[_T("%%2Sided, Calendar%%"),		0x00000004]
]);

MACHINE.DB.ScanDefDuplexA4 = 
MACHINE.DB.FaxDefDuplexA4 = new SWS.UTIL.DataArray([
	[_T("%%1 Sided%%"),			0x00000001],
	[_T("%%2 Sided%%"),		      0x00000002],
	[_T("%%2 Sided Rotated%%"),		0x00000004]
]);
			
/* Fax Forward */
MACHINE.DB.F2EForwarding = new SWS.UTIL.DataArray([
	[LN.Off,				0x00000001],
	[_T("%%Sent Faxes Only%%"),		0x00000002],
	[_T("%%Received Faxes Only%%"),		0x00000004],
	[LN.All,				0x00000008]
]);

MACHINE.DB.F2EConfirmSheet = new SWS.UTIL.DataArray([
	[_T("%%On Errors Only%%"),			0x00000000],
	[LN.Always,							0x00000001],
	[LN.Never,							0x00000002]
]);


MACHINE.DB.F2EAttachType = new SWS.UTIL.DataArray([
	[_T("%%PDF%%"),						0x00000001],
	[_T("%%TIFF%%"),					0x00000002],
	[_T("%%Multi-Page TIFF%%"),			0x00000004],
	[_T("%%Single-Page TIFF%%"),		0x00000008],
	[_T("%%JPEG%%"),					0x00000010],
	[_T("%%BMP%%"),						0x00000020]	
]);

/* Scan Default */
MACHINE.DB.ScanDefQuality = new SWS.UTIL.DataArray([
	[_T("%%Draft%%"),		0x00000001],
	[_T("%%Normal%%"),		0x00000002],
	[_T("%%Best%%"),			0x00000004]
]);

/* S2Email  */

MACHINE.DB.S2EDefOriginalType = new SWS.UTIL.DataArray([
	[_T("%%Text%%"),				0x00000001],
	[_T("%%Text/Photo%%"),			0x00000002],
	[_T("%%Photo%%"),				0x00000004],
	[_T("%%LineArt%%"),				0x00000008],
	[LN.Color,						0x00000010],
	[_T("%%Gray%%"),				0x00000020]
]);

MACHINE.DB.S2EDefScanColor = new SWS.UTIL.DataArray([
	[_T("%%Mono%%"),			0x00000001],
	[_T("%%Gray%%"),			0x00000002],
	[LN.Color,					0x00000004]
]);

MACHINE.DB.S2EDefImageFormat = new SWS.UTIL.DataArray([
	[_T("%%PDF%%"),						0x00000001],
	[_T("%%TIFF%%"),					0x00000002],
	[_T("%%Multi-Page TIFF%%"),			0x00000004],
	[_T("%%Single-Page TIFF%%"),		0x00000008],
	[_T("%%JPEG%%"),					0x00000010],
	[_T("%%BMP%%"),						0x00000020],
	[_T("%%XPS%%"),						0x00000040],
	[_T("%%Multi-Page PDF%%"),			0x00000080],
	[_T("%%Single-Page PDF%%"),			0x00000100],
	[_T("%%Multi-Page XPS%%"),			0x00000200],
	[_T("%%Single-Page XPS%%"),			0x00000400]	
]);

MACHINE.DB.NewScanDefImageFormat = new SWS.UTIL.DataArray([
	[_T("%%PDF%%"),						0x00000100],	
	[_T("%%TIFF%%"),						0x00000008],	
	[_T("%%JPEG%%"),					0x00000010],	
	[_T("%%XPS%%"),						0x00000400],
	[_T("%%Multi-Page PDF%%"),			0x00000080],
	[_T("%%Multi-Page TIFF%%"),			0x00000004],	
	[_T("%%BMP%%"),						0x00000020],
	[_T("%%Multi-Page XPS%%"),			0x00000200]	
]);

MACHINE.DB.S2EDefResolution = new SWS.UTIL.DataArray([
	["72 " + LN.DPI,			0x00000001],
	["75 " + LN.DPI,			0x00000002],
	["100 " + LN.DPI,			0x00000004],
	["200 " + LN.DPI,			0x00000008],
	["300 " + LN.DPI,			0x00000010],
	["400 " + LN.DPI,			0x00000020],
	["500 " + LN.DPI,			0x00000040],
	["600 " + LN.DPI,			0x00000080],
	["1200 " + LN.DPI,			0x00000100]
]);

MACHINE.DB.S2EConfirmReport = new SWS.UTIL.DataArray([
	[_T("%%On Errors Only%%"),		0x00000000],
	[_T("%%Always%%"),				0x00000001],
	[_T("%%Never%%"),				0x00000002]	
]);

/* S2Server FTP  */
MACHINE.DB.S2FileFtpOriginalType = new SWS.UTIL.DataArray([
	[_T("%%Text%%"),						0x00000001],
	[_T("%%Text/Photo%%"),					0x00000002],
	[_T("%%Photo%%"),						0x00000004],
	[_T("%%LineArt(Black&White)%%"),		0x00000008],
	[LN.Color,								0x00000010],
	[_T("%%Gray%%"),						0x00000020]
]);

MACHINE.DB.S2FileFtpScanColor = new SWS.UTIL.DataArray([
	[_T("%%Mono%%"),			0x00000002],
	[_T("%%Gray%%"),			0x00000004],
	[LN.Color,					0x00000001]	
]);

MACHINE.DB.S2FileFtpImageFormatGUI = new SWS.UTIL.DataArray([
	[_T("%%Single-Page TIFF%%"),		0x00000001],
	[_T("%%Multi-Page TIFF%%"),			0x00000002],
	[_T("%%PDF%%"),						0x00000004],
	[_T("%%JPEG%%"),					0x00000008],
	[_T("%%XPS%%"),						0x00000010],
	[_T("%%Multi-Page PDF%%"),			0x00000020],
	[_T("%%Single-Page PDF%%"),			0x00000040],
	[_T("%%Multi-Page XPS%%"),			0x00000080],
	[_T("%%Single-Page XPS%%"),			0x00000100]	
]);

MACHINE.DB.S2SrvFileFormat = new SWS.UTIL.DataArray([
	[_T("%%PDF%%"),						0x00000040],
	[_T("%%Multi-Page PDF%%"),			0x00000200],
	[_T("%%Multi-Page TIFF%%"),			0x00000002],
	[_T("%%TIFF%%"),						0x00000001],
	[_T("%%JPEG%%"),					0x00000008],
	[_T("%%Multi-Page XPS%%"),			0x00000080],
	[_T("%%XPS%%"),						0x00000100]
]);


MACHINE.DB.S2FileFtpImageFormat = new SWS.UTIL.DataArray([
	[_T("%%BMP%%"),				0x00000001],
	[_T("%%TIFF%%"),			0x00000002],
	[_T("%%PDF%%"),				0x00000004],
	[_T("%%JPEG%%"),			0x00000008],
	[_T("%%XPS%%"),				0x00000010]	
]);

MACHINE.DB.S2FileFtpResolution = new SWS.UTIL.DataArray([
	[_T("%%100 dpi%%"),			0x00000001],
	[_T("%%200 dpi%%"),			0x00000002],
	[_T("%%300 dpi%%"),			0x00000004],
	[_T("%%400 dpi%%"),			0x00000008],
	[_T("%%600 dpi%%"),			0x00000010]
]);
MACHINE.DB.S2FileFtpConfirmReport = new SWS.UTIL.DataArray([
	[_T("%%Always%%"),				0x00000002],
	[_T("%%Never%%"),				0x00000001],	
	[_T("%%On Errors Only%%"),		0x00000004]	
]);

MACHINE.DB.Level11Store = new SWS.UTIL.DataArray([
	[_T("%%Light+5%%"),			0x00000001],
	[_T("%%Light+4%%"),			0x00000002],
	[_T("%%Light+3%%"),			0x00000004],
	[_T("%%Light+2%%"),			0x00000008],
	[_T("%%Light+1%%"),			0x00000010],
	[_T("%%Normal%%"),			0x00000020],
	[_T("%%Dark+1%%"),			0x00000040],
	[_T("%%Dark+2%%"),			0x00000080],
	[_T("%%Dark+3%%"),			0x00000100],
	[_T("%%Dark+4%%"),			0x00000200],
	[_T("%%Dark+5%%"),			0x00000400]
]);

/* Scan S2Server SMB */
MACHINE.DB.S2FileSmbDefOriginalType = new SWS.UTIL.DataArray([
	[_T("%%Text%%"),						0x00000001],
	[_T("%%Text/Photo%%"),					0x00000002],
	[_T("%%Photo%%"),						0x00000004],
	[_T("%%LineArt(Black&White)%%"),		0x00000008],
	[LN.Color,								0x00000010],
	[_T("%%Gray%%"),						0x00000020]
]);

MACHINE.DB.S2FileSmbDefScanColor = new SWS.UTIL.DataArray([
	[LN.Color,					0x00000001],
	[_T("%%Mono%%"),			0x00000002],
	[_T("%%Gray%%"),			0x00000004]
	
]);

MACHINE.DB.S2FileSmbDefImageFormat = new SWS.UTIL.DataArray([
	[_T("%%Single-Page TIFF%%"),		0x00000001],
	[_T("%%Multi-Page TIFF%%"),			0x00000002],
	[_T("%%PDF%%"),						0x00000004],
	[_T("%%JPEG%%"),					0x00000008],
	[_T("%%Multi-Page PDF%%"),			0x00000010],
	[_T("%%Single-Page PDF%%"),			0x00000020]			
]);

MACHINE.DB.S2FileFtpDefResolution = new SWS.UTIL.DataArray([
	["100 " + LN.DPI,			0x00000001],
	["200 " + LN.DPI,			0x00000002],
	["300 " + LN.DPI,			0x00000004],
	["400 " + LN.DPI,			0x00000008],
	["600 " + LN.DPI,			0x00000010]
]);

/* Layout */
MACHINE.DB.orientation = new SWS.UTIL.DataArray([
	[_T("%%Portrait%%"),				0x00000001],
	[_T("%%Landscape%%"),				0x00000002],
	[_T("%%Reverse Landscape%%"),		0x00000004],
	[_T("%%Reverse Portrait%%"),		0x00000008]		
]);

/* Supplies */
MACHINE.DB.drumStatus = new SWS.UTIL.DataArray([
	[_T("%%Unidentified%%"),									0x00000000],
	[_T("%%Ready%%"),										0x00000001],
	[_T("%%Warning%%"),										0x00000002],
	[_T("%%Replace Imaging Unit%%"),							0x00000004],
	[_T("%%Imaging Unit Warning (Replace Imaging Unit)%%"),		0x00000008],
	[_T("%%Replace Imaging Unit1%%"),							0x00000010],
	[_T("%%Replace Imaging Unit%%"),							0x00000020],
	[_T("%%Install Developer-Imaging Unit%%"),					0x00000040],
	[_T("%%Imaging Unit Lock%%"),								0x00000080],
	[_T("%%Imaging Unit Write Error%%"),							0x00000100],
	[_T("%%Imaging Unit Communication Error%%"),					0x00000200],
	[_T("%%Invalid Imaging Unit%%"),							0x00000400],
	[_T("%%Imaging Unit Read Error%%"),							0x00000800],
	[_T("%%Non Genuine Imaging Unit, Replace Imaging Unit%%"),		0x00001000],
	[_T("%%Non Genuine Imaging Unit, Replace Imaging Unit1%%"),		0x00002000],
	[_T("%%Invalid Imaging unit cartridge%%"),						0x00004000],
	[_T("%%Imaging unit Expired%%"),								0x00008000]
]);

MACHINE.DB.tonerStatus = new SWS.UTIL.DataArray([
	[_T("%%Ready%%"),										0x00000000],
	[_T("%%Toner is low. Order new one%%"),						0x00000001],
	[_T("%%Toner is empty. Replace with new one%%"),				0x00000002],
	[_T("%%Toner cartridge is not installed. Install it%%"),				0x00000004],
	[_T("%%Toner cartridge is not compatible. Check guide%%"),		0x00000008],
	[_T("%%Did not supply enough toner. Open/close door%%"),		0x00000010],
	[_T("%%Toner is worn. Replace with new one%%"),				0x00000020],
	[_T("%%Error: #06-006. Open/close door%%"),					0x00000040],
	[_T("%%Error: #06-007. Open/close door%%"),					0x00000080],
	[_T("%%Replace with New Toner%%"),							0x00000100],
	[_T("%%Unidentified%%"),									0x00000200],
	[_T("%%Imaging unit is low. Order new one%%"),				0x00000400],
	[_T("%%Imaging unit is worn. Replace with new one%%"),			0x00000800],
	[_T("%%Imaging unit is not installed. Install it%%"),				0x00001000],
	[_T("%%Error: #06-013. Open/close door%%"),					0x00002000],
	[_T("%%Error: #06-014. Open/close door%%"),					0x00004000],
	[_T("%%Error: #06-015. Open/close door%%"),						0x00008000],
	[_T("%%Error: #06-016. Open/close door%%"),					0x00010000],
	[_T("%%Imaging unit is not compatible. Check guide%%"),			0x00020000],
	[_T("%%Unidentified%%"),									0x00040000],
	[_T("%%Unidentified%%"),									0x00080000],
	[_T("%%Error: #06-020. Open/close door%%"),					0x00100000],
	[_T("%%Error: #06-021. Open/close door%%"),					0x00200000],
	[_T("%%Supplying toner. Please wait%%"),						0x00400000],
	[_T("%%Toner cartridge is not compatible. Check guide%%"),		0x00800000],
	[_T("%%Imaging unit is not compatible. Check guide%%"),			0x01000000],
	[_T("%%Toner is worn. Replace with new one%%"),				0x02000000],
	[_T("%%Supplying toner. Please wait%%"),						0x04000000],
	[_T("%%Did not supply enough toner. Reinstall it%%"),			0x08000000],
	[_T("%%Toner is empty. Replace with new one%%"),				0x10000000],
	[_T("%%Imaging unit is empty. Replace with new one%%"),			0x20000000],
	[_T("%%Shake toner cartridge%%"),		 					0x40000000]
]);

MACHINE.DB.ozoneFilterStatus = 
MACHINE.DB.finisherStatus = 
MACHINE.DB.wasteTonerStatus = new SWS.UTIL.DataArray([
	 [_T("%%Full%%"),   0x00000000],
	 [_T("%%Near Full%%"),   0x00000001],
	 [_T("%%Normal%%"),   0x00000002],
	 [_T("%%Near Empty%%"),  0x00000003], 
	 [_T("%%Empty%%"),  0x00000004], 
	 [_T("%%Not Installed%%"),  0x00000005] 
]);

/*Standard Error Code for MONO*/ 
MACHINE.DB.StdErrStatusMono = new SWS.UTIL.DataArray([
	[LN.MSG_READY, 0x00000000],
	[_T("%%Prepare new toner cartridge%%"), 0x00000001],	/* BB_ERR_C1_0	bit[0] */
	[_T("%%End of life, Replace with new toner cartridge%%"), 0x00000002],	/*  BB_ERR_C1_0	bit[15] */
	[_T("%%Toner cartridge is not installed. Install the cartridge%%"), 0x00000004],	/* BB_ERR_C1_0	bit[29] */
	[_T("%%Toner cartridge is not compatible. Check users guide%%"), 0x00000008],  /* BB_ERR_C1_1	bit[2] */
	[_T("%%Toner Cartridge Failure: #C1-1311. Install toner cartridge again%%"), 0x00000010],	/* BB_ERR_C1_0	bit[21] */
	[_T("%%Replace with new toner cartridge%%"), 0x00000020],	/* BB_ERR_C1_0	bit[5] */
	[_T("%%Toner cartridge: #06-006. Please open/close door%%"), 0x00000040],  /* Not yet */
	[_T("%%Toner cartridge: #06-007. Please open/close door%%"), 0x00000080], /* Not yet */
	[_T("%%Replace with new toner cartridge%%"), 0x00000100], /* Not yet */
	[LN.Unidentified, 0x00000200],
	[_T("%%Prepare new imaging unit%%"), 0x00000400],  /* BB_ERR_C3_0	bit[0]  */
	[_T("%%End of life, Replace with new imaging unit%%"), 0x00000800],  /* BB_ERR_C3_0	bit[5] */
	[_T("%%Imaging Unit Failure: #C3-1320. Install imaging unit again%%"), 0x00001000],   /* BB_ERR_C3_0	bit[30] */
	[_T("%%Imaging unit error: #06-013. Please open/close door%%"), 0x00002000], /* Not yet */
	[_T("%%Imaging unit error: #06-014. Please open/close door%%"), 0x00004000], /* Not yet */
	[_T("%%Imaging unit error: #06-015. Please open/close door%%"), 0x00008000], /* Not yet */
	[_T("%%Imaging unit error: #06-016. Please open/close door%%"), 0x00010000], /* Not yet */
	[_T("%%Imaging unit is not compatible. Check users guide%%"), 0x00020000], /* BB_ERR_C3_1	bit[12] */
	[LN.Unidentified, 0x00040000],
	[LN.Unidentified, 0x00080000],
	[_T("%%Toner cartridge error: #06-020. Please open/close door%%"), 0x00100000], /* Not yet */
	[_T("%%Imaging unit error: #06-021. Please open/close door%%"), 0x00200000], /* Not yet */
	[_T("%%Supplying and mixing toner to new imaging unit... Please wait%%"), 0x00400000], /* Not yet */
	[_T("%%Toner Failure: #C1-1330. Install toner cartridge again%%"), 0x00800000],  /* BB_ERR_C1_5	bit[25] */
	[_T("%%Imaging Unit Failure: #C3-1315. Install imaging unit again%%"), 0x01000000],  /* BB_ERR_C3_0	bit[28] */
	[_T("%%Replace with new toner cartridge%%"), 0x02000000], /* Not yet */
	[_T("%%Did not supply enough toner.  Remove seal tape & reinstall%%"), 0x04000000], /* BB_ERR_C1_0	bit[30] */
	[_T("%%Did not supply enough toner. Remove seal tape & reinstall%%"), 0x08000000], /* Not yet */
	[_T("%%End of life, Replace with new toner cartridge%%"), 0x10000000], /* Not yet */
	[_T("%%End of life, Replace with new imaging unit%%"), 0x20000000],  /* BB_ERR_C3_0	bit[15] */
	[_T("%%Shake toner cartridge and then install%%"), 0x40000000]  /* BB_ERR_C1_0  bit[31] */
]);

/*Standard Toner Status Message_List_ALL_V2.36T.xls(RoseR)*/
MACHINE.DB.StdErrStatusBlack = new SWS.UTIL.DataArray([
	[LN.MSG_READY, 0x00000000],
	[_T("%%Prepare new black toner cartridge%%"), 0x00000001],
	[_T("%%End of life, Replace with new black toner cartridge%%"), 0x00000002],
	[_T("%%Black toner cartridge is not installed. Install it%%"), 0x00000004],
	[_T("%%Black toner cartridge is not compatible. Check user's guide%%"), 0x00000008],
	[_T("%%Did not supply enough black toner. Please open/close door%%"), 0x00000010],
	[_T("%%Replace with new black toner cartridge%%"), 0x00000020],
	[_T("%%Toner cartridge: #06-006. Please open/close door%%"), 0x00000040],
	[_T("%%Toner cartridge: #06-007. Please open/close door%%"), 0x00000080],
	[_T("%%Replace with new black toner cartridge%%"), 0x00000100],
	[LN.Unidentified, 0x00000200],
	[_T("%%Prepare new black imaging unit%%"), 0x00000400],
	[_T("%%Replace with new black imaging unit%%"), 0x00000800],
	[_T("%%Black imaging unit is not installed. Install it%%"), 0x00001000],
	[_T("%%Imaging unit error: #06-013. Please open/close door%%"), 0x00002000],
	[_T("%%Imaging unit error: #06-014. Please open/close door%%"), 0x00004000],
	[_T("%%Imaging unit error: #06-015. Please open/close door%%"), 0x00008000],
	[_T("%%Imaging unit error: #06-016. Please open/close door%%"), 0x00010000],
	[_T("%%Black imaging unit is not compatible. Check user's guide%%"), 0x00020000],
	[LN.Unidentified, 0x00040000],
	[LN.Unidentified, 0x00080000],
	[_T("%%Toner cartridge error: #06-020. Please open/close door%%"), 0x00100000],
	[_T("%%Imaging unit error: #06-021. Please open/close door%%"), 0x00200000],
	[_T("%%Supplying and mixing toner to new imaging unit... Please wait%%"), 0x00400000],
	[_T("%%Black toner cartridge is not compatible. Check user's guide%%"), 0x00800000],
	[_T("%%Black imaging unit is not compatible. Check user's guide%%"), 0x01000000],
	[_T("%%Replace with new black toner cartridge%%"), 0x02000000],
	[_T("%%Supplying and mixing toner to black imaging unit... Please wait%%"), 0x04000000],
	[_T("%%Did not supply enough black toner. Remove seal tape & reinstall%%"), 0x08000000],
	[_T("%%End of life, Replace with new black toner cartridge%%"), 0x10000000],
	[_T("%%End of life, Replace with new black imaging unit%%"), 0x20000000],
	[_T("%%Shake black toner cartridge%%"), 0x40000000]
]);

MACHINE.DB.StdErrStatusCyan = new SWS.UTIL.DataArray([
	[LN.MSG_READY, 0x00000000],
	[_T("%%Prepare new cyan toner cartridge%%"), 0x00000001],
	[_T("%%End of life, Replace with new cyan toner cartridge%%"), 0x00000002],
	[_T("%%Cyan toner cartridge is not installed. Install it%%"), 0x00000004],
	[_T("%%Cyan toner cartridge is not compatible. Check user's guide%%"), 0x00000008],
	[_T("%%Did not supply enough cyan toner. Please open/close door%%"), 0x00000010],
	[_T("%%Replace with new cyan toner cartridge%%"), 0x00000020],
	[_T("%%Toner cartridge: #25-006. Please open/close door%%"), 0x00000040],
	[_T("%%Toner cartridge: #25-007. Please open/close door%%"), 0x00000080],
	[LN.Unidentified, 0x00000100],
	[LN.Unidentified, 0x00000200],
	[_T("%%Prepare new cyan imaging unit%%"), 0x00000400],
	[_T("%%Replace with new cyan imaging unit%%"), 0x00000800],
	[_T("%%Cyan imaging unit is not installed. Install it%%"), 0x00001000],
	[_T("%%Imaging unit error: #25-013. Please open/close door%%"), 0x00002000],
	[_T("%%Imaging unit error: #25-014. Please open/close door%%"), 0x00004000],
	[_T("%%Imaging unit error: #25-015. Please open/close door%%"), 0x00008000],
	[_T("%%Imaging unit error: #25-016. Please open/close door%%"), 0x00010000],
	[_T("%%Cyan imaging unit is not compatible. Check user's guide%%"), 0x00020000],
	[LN.Unidentified, 0x00040000],
	[LN.Unidentified, 0x00080000],
	[_T("%%Toner cartridge error: #25-020. Please open/close door%%"), 0x00100000],
	[_T("%%Imaging unit error: #25-021. Please open/close door%%"), 0x00200000],
	[_T("%%Supplying and mixing toner to new imaging unit... Please wait%%"), 0x00400000],
	[_T("%%Cyan toner cartridge is not compatible. Check user's guide%%"), 0x00800000],
	[_T("%%Cyan imaging unit is not compatible. Check user's guide%%"), 0x01000000],
	[_T("%%Replace with new cyan toner cartridge%%"), 0x02000000],
	[_T("%%Supplying and mixing toner to cyan imaging unit... Please wait%%"), 0x04000000],
	[_T("%%Did not supply enough cyan toner. Remove seal tape & reinstall%%"), 0x08000000],
	[_T("%%End of life, Replace with new cyan toner cartridge%%"), 0x10000000],
	[_T("%%End of life, Replace with new cyan imaging unit%%"), 0x20000000],
	[_T("%%Shake cyan toner cartridge%%"), 0x40000000]
]);

MACHINE.DB.StdErrStatusMagenta = new SWS.UTIL.DataArray([
	[LN.MSG_READY, 0x00000000],
	[_T("%%Prepare new magenta toner cartridge%%"), 0x00000001],
	[_T("%%End of life, Replace with new magenta toner cartridge%%"), 0x00000002],
	[_T("%%Magenta toner cartridge is not installed. Install it%%"), 0x00000004],
	[_T("%%Magenta toner cartridge is not compatible. Check user's guide%%"), 0x00000008],
	[_T("%%Did not supply enough magenta toner. Please open/close door%%"), 0x00000010],
	[_T("%%Replace with new magenta toner cartridge%%"), 0x00000020],
	[_T("%%Toner cartridge: #26-006. Please open/close door%%"), 0x00000040],
	[_T("%%Toner cartridge: #26-007. Please open/close door%%"), 0x00000080],
	[LN.Unidentified, 0x00000100],
	[LN.Unidentified, 0x00000200],
	[_T("%%Prepare new magenta imaging unit%%"), 0x00000400],
	[_T("%%Replace with new magenta imaging unit%%"), 0x00000800],
	[_T("%%Magenta imaging unit is not installed. Install it%%"), 0x00001000],
	[_T("%%Imaging unit error: #26-013. Please open/close door%%"), 0x00002000],
	[_T("%%Imaging unit error: #26-014. Please open/close door%%"), 0x00004000],
	[_T("%%Imaging unit error: #26-015. Please open/close door%%"), 0x00008000],
	[_T("%%Imaging unit error: #26-016. Please open/close door%%"), 0x00010000],
	[_T("%%Magenta imaging unit is not compatible. Check user's guide%%"), 0x00020000],
	[LN.Unidentified, 0x00040000],
	[LN.Unidentified, 0x00080000],
	[_T("%%Toner cartridge error: #26-020. Please open/close door%%"), 0x00100000],
	[_T("%%Imaging unit error: #26-021. Please open/close door%%"), 0x00200000],
	[_T("%%Supplying and mixing toner to new imaging unit... Please wait%%"), 0x00400000],
	[_T("%%Magenta toner cartridge is not compatible. Check user's guide%%"), 0x00800000],
	[_T("%%Magenta imaging unit is not compatible. Check user's guide%%"), 0x01000000],
	[_T("%%Replace with new magenta toner cartridge%%"), 0x02000000],
	[_T("%%Supplying and mixing toner to magenta imaging unit... Please wait%%"), 0x04000000],
	[_T("%%Did not supply enough magenta toner. Remove seal tape & reinstall%%"), 0x08000000],
	[_T("%%End of life, Replace with new magenta toner cartridge%%"), 0x10000000],
	[_T("%%End of life, Replace with new magenta imaging unit%%"), 0x20000000],
	[_T("%%Shake magenta toner cartridge%%"), 0x40000000]
]);

MACHINE.DB.StdErrStatusYellow = new SWS.UTIL.DataArray([
	[LN.MSG_READY, 0x00000000],
	[_T("%%Prepare new yellow toner cartridge%%"), 0x00000001],
	[_T("%%End of life, Replace with new yellow toner cartridge%%"), 0x00000002],
	[_T("%%Yellow toner cartridge is not installed. Install it%%"), 0x00000004],
	[_T("%%Yellow toner cartridge is not compatible. Check user's guide%%"), 0x00000008],
	[_T("%%Did not supply enough yellow toner. Please open/close door%%"), 0x00000010],
	[_T("%%Replace with new yellow toner cartridge%%"), 0x00000020],
	[_T("%%Toner cartridge: #27-006. Please open/close door%%"), 0x00000040],
	[_T("%%Toner cartridge: #27-007. Please open/close door%%"), 0x00000080],
	[LN.Unidentified, 0x00000100],
	[LN.Unidentified, 0x00000200],
	[_T("%%Prepare new yellow imaging unit%%"), 0x00000400],
	[_T("%%Replace with new yellow imaging unit%%"), 0x00000800],
	[_T("%%Yellow imaging unit is not installed. Install it%%"), 0x00001000],
	[_T("%%Imaging unit error: #27-013. Please open/close door%%"), 0x00002000],
	[_T("%%Imaging unit error: #27-014. Please open/close door%%"), 0x00004000],
	[_T("%%Imaging unit error: #27-015. Please open/close door%%"), 0x00008000],
	[_T("%%Imaging unit error: #27-016. Please open/close door%%"), 0x00010000],
	[_T("%%Yellow imaging unit is not compatible. Check user's guide%%"), 0x00020000],
	[LN.Unidentified, 0x00040000],
	[LN.Unidentified, 0x00080000],
	[_T("%%Toner cartridge error: #27-020. Please open/close door%%"), 0x00100000],
	[_T("%%Imaging unit error: #27-021. Please open/close door%%"), 0x00200000],
	[_T("%%Supplying and mixing toner to new imaging unit... Please wait%%"), 0x00400000],
	[_T("%%Yellow toner cartridge is not compatible. Check user's guide%%"), 0x00800000],
	[_T("%%Yellow imaging unit is not compatible. Check user's guide%%"), 0x01000000],
	[_T("%%Replace with new yellow toner cartridge%%"), 0x02000000],
	[_T("%%Supplying and mixing toner to yellow imaging unit... Please wait%%"), 0x04000000],
	[_T("%%Did not supply enough yellow toner. Remove seal tape & reinstall%%"), 0x08000000],
	[_T("%%End of life, Replace with new yellow toner cartridge%%"), 0x10000000],
	[_T("%%End of life, Replace with new yellow imaging unit%%"), 0x20000000],
	[_T("%%Shake yellow toner cartridge%%"), 0x40000000]
]);

/* Epson Font */
MACHINE.DB.epsonFont = new SWS.UTIL.DataArray([
	[_T("%%SANSERIF%%"),				0x00000001],
	[_T("%%ROMAN%%"),				0x00000002]
]);

/* Epson Auto Wrap */
MACHINE.DB.epsonAutowrap = new SWS.UTIL.DataArray([
	[LN.Off,				0x00000001],
	[LN.On,				0x00000002]
]);


/* Epson Character Set */
MACHINE.DB.epsonCharSet = new SWS.UTIL.DataArray([
	[_T("%%USA%%"),				0x00000001],
	[_T("%%France%%"),			0x00000002],
	[_T("%%Germany%%"),			0x00000004],
	[_T("%%UK%%"),				0x00000008],
	[_T("%%Denmark1%%"),		0x00000010],
	[_T("%%Sweden%%"),			0x00000020],
	[_T("%%Italy%%"),			0x00000040],
	[_T("%%Spain1%%"),			0x00000080],
	[_T("%%Japan%%"),			0x00000100],
	[_T("%%Norway%%"),			0x00000200],
	[_T("%%Denmark2%%"),		0x00000400],
	[_T("%%Spain2%%"),			0x00000800],
	[_T("%%Latin%%"),			0x00001000]
]);

/* Epson Character Table */
MACHINE.DB.epsonCharTable = new SWS.UTIL.DataArray([
	[_T("%%ITALIC%%"),			0x00000001],
	[_T("%%PC437US%%"),			0x00000002],
	[_T("%%PC850%%"),			0x00000004],
	[_T("%%HEBREWOLD%%"),		0x00000008],
	[_T("%%HEBREWNEW%%"),		0x00000010]
]);

/* Epson Pitch */
MACHINE.DB.epsonPitch = new SWS.UTIL.DataArray([
	["10",			0x00000001],
	["10.3",		0x00000010],
	["12",			0x00000002],
	["17.14",		0x00000004],
	["20",			0x00000008]
]);

/* Epson Top Margin */
MACHINE.DB.epsonTopMargin = new SWS.UTIL.DataArray([
	["0",			0x00000001],
	["-1",			0x00000002],
	["-2",			0x00000004],
	["-3",			0x00000008],
	["-4",			0x00000010],
	["-5",			0x00000020]	
]);


/* KSC5843 Font */
MACHINE.DB.ksc5843Font = new SWS.UTIL.DataArray([
	[_T("%%MYUNGJO%%"),			0x00000001],
	[_T("%%GOTHIC%%"),			0x00000002],
	[_T("%%GUNGSEO%%"),			0x00000004],
	[_T("%%GULLIM%%"),			0x00000008],
	[_T("%%SAMMOOL%%"),			0x00000010],
	[_T("%%YETCHE%%"),			0x00000020],
	[_T("%%POST%%"),			0x00000040],
	[_T("%%NEWGRAPH%%"),		0x00000080],
	[_T("%%SUNMYOUNGJO%%"),		0x00000100],
	[_T("%%PILGI%%"),			0x00000200],
	[_T("%%HEADLINE%%"),		0x00000400],
	[_T("%%OCR_B1%%"),			0x00000800]
]);

/* KSC5843 Code*/
MACHINE.DB.ksc5843Code = new SWS.UTIL.DataArray([
	[_T("%%WANSUNG%%"),			0x00000001],
	[_T("%%JOHAP%%"),			0x00000002]
]);

/* KSC5843 CPI */
MACHINE.DB.ksc5843CPI = new SWS.UTIL.DataArray([
	["10",			0x00000001],
	["12",			0x00000002],
	["13.3",		0x00000004],
	["15",			0x00000008],
	["20",			0x00000010],
	["24",			0x00000020],
	["26.7",		0x00000040],
	["30",			0x00000080]
]);

/* KSC5843 AutoWrap*/
MACHINE.DB.ksc5843AutoWrap = new SWS.UTIL.DataArray([
	[LN.Off,					0x00000001],
	[LN.On,						0x00000002]
]);

/* KSC5843 Top Margin */
MACHINE.DB.ksc5843TopMargin = new SWS.UTIL.DataArray([
	["0",			0x00000001],
	["-1",			0x00000002],
	["-2",			0x00000004],
	["-3",			0x00000008],
	["-4",			0x00000010],
	["-5",			0x00000020],
	["-6",			0x00000040],
	["-7",			0x00000080],
	["-8",			0x00000100]	
]);

/* KSSM Font */
MACHINE.DB.kssmFont = new SWS.UTIL.DataArray([
	[_T("%%MYUNGJO%%"),			0x00000001],
	[_T("%%GOTHIC%%"),			0x00000002],
	[_T("%%GUNGSEO%%"),			0x00000004],
	[_T("%%GULLIM%%"),			0x00000008],
	[_T("%%SAMMOOL%%"),			0x00000010],
	[_T("%%YETCHE%%"),			0x00000020],
	[_T("%%POST%%"),			0x00000040],
	[_T("%%NEWGRAPH%%"),		0x00000080],
	[_T("%%SUNMYOUNGJO%%"),		0x00000100],
	[_T("%%PILGI%%"),			0x00000200],
	[_T("%%HEADLINE%%"),		0x00000400],
	[_T("%%OCR_B1%%"),			0x00000800]
]);

/* KSSM Code*/
MACHINE.DB.kssmCode = new SWS.UTIL.DataArray([
	[_T("%%WANSUNG%%"),			0x00000001],
	[_T("%%JOHAP%%"),			0x00000002]
]);

/* KSSM CPI */
MACHINE.DB.kssmCPI = new SWS.UTIL.DataArray([
	["10",			0x00000001],
	["12",			0x00000002],
	["13.3",		0x00000004],
	["15",			0x00000008],
	["20",			0x00000010],
	["24",			0x00000020],
	["26.7",		0x00000040],
	["30",			0x00000080]
]);

/* KSSM AutoWrap*/
MACHINE.DB.kssmAutoWrap = new SWS.UTIL.DataArray([
	[LN.Off,					0x00000001],
	[LN.On,						0x00000002]
]);

/* KSSM Top Margin */
MACHINE.DB.kssmTopMargin = new SWS.UTIL.DataArray([
	["0",			0x00000001],
	["-1",			0x00000002],
	["-2",			0x00000004],
	["-3",			0x00000008],
	["-4",			0x00000010],
	["-5",			0x00000020],
	["-6",			0x00000040],
	["-7",			0x00000080],
	["-8",			0x00000100]	
]);

/* KSC5895 Font */
MACHINE.DB.ksc5895Font = new SWS.UTIL.DataArray([
	[_T("%%MYUNGJO%%"),			0x00000001],
	[_T("%%GOTHIC%%"),			0x00000002],
	[_T("%%GUNGSEO%%"),			0x00000004],
	[_T("%%GULLIM%%"),			0x00000008],
	[_T("%%SAMMOOL%%"),			0x00000010],
	[_T("%%YETCHE%%"),			0x00000020],
	[_T("%%POST%%"),			0x00000040],
	[_T("%%NEWGRAPH%%"),		0x00000080],
	[_T("%%SUNMYOUNGJO%%"),		0x00000100],
	[_T("%%PILGI%%"),			0x00000200],
	[_T("%%HEADLINE%%"),		0x00000400],
	[_T("%%OCR_B1%%"),			0x00000800]
]);

/* KSC5895 Code*/
MACHINE.DB.ksc5895Code = new SWS.UTIL.DataArray([
	[_T("%%WANSUNG%%"),			0x00000001],
	[_T("%%JOHAP%%"),			0x00000002]
]);

/* KSC5895 LPI */
MACHINE.DB.ksc5895LPI = new SWS.UTIL.DataArray([
	["1",			0x00000001],
	["2",			0x00000002],
	["3",			0x00000004],
	["4",			0x00000008],
	["5",			0x00000010],
	["6",			0x00000020],
	["8",			0x00000040],
	["12",			0x00000080],
	["16",			0x00000100],
	["24",			0x00000200],
	["48",			0x00000400],
	["60",			0x00000800]	
]);

/* KSC5895 AutoWrap*/
MACHINE.DB.ksc5895AutoWrap = new SWS.UTIL.DataArray([
	[LN.Off,					0x00000001],
	[LN.On,						0x00000002]
]);

MACHINE.DB.stampPosition = new SWS.UTIL.DataArray([
	[_T("%%Top%%"),					0x00000001],
	[_T("%%Bottom%%"),				0x00000002]
]);

MACHINE.DB.stampAppearance = new SWS.UTIL.DataArray([
	[_T("%%Opaque%%"),					0x00000001],
	[_T("%%Transparent%%"),				0x00000002]
]);
/*XOA Web*/
MACHINE.DB.XoaWebSecurityMode = new SWS.UTIL.DataArray([
	[_T("%%None%%"),			0x00000001],
	[_T("%%Hash mode%%"),			0x00000002],
	[_T("%%ID/Password Mode%%"),			0x00000004]
]);

/*Added for Rioch Engine*/ 
MACHINE.DB.SuppliesStatus = new SWS.UTIL.DataArray([
 [_T("%%Normal status%%"), 0x00000000],
 [_T("%%Near end status%%"), 0x00000001],
 [_T("%%Pre near end status%%"), 0x00000002],
 [_T("%%Reached life end%%"), 0x00000004],
 [_T("%%Reached life end status%%"), 0x00000008],
 [_T("%%Not reach life end status%%"), 0x00000010],
 [_T("%%End status%%"), 0x00000020]
]);

MACHINE.DB.AutoContinue = new SWS.UTIL.DataArray([
 [_T("%%Off%%"), 0x00000001],
 [_T("%%After 0 sec%%"), 0x00000002],
 [_T("%%After 30 sec%%"), 0x00000004]
]);

/* Menu Management */
MACHINE.DB.MenuMgt = new SWS.UTIL.DataArray([
	[_T("%%Information%%"),			0x00000001],
	[_T("%%Layout%%"),				0x00000002],
	[_T("%%Paper%%"),				0x00000004],
	[_T("%%Graphic%%"),				0x00000008],
	[_T("%%Fax%%"),					0x00000010],
	[_T("%%Fax Feature%%"),			0x00000020],
	[_T("%%Fax Setup%%"),			0x00000040],
	[_T("%%Copy%%"),				0x00000080],
	[_T("%%Copy Feature%%"),		0x00000100],
	[_T("%%Copy Setup%%"),			0x00000200],
	[_T("%%Scan%%"),					0x00000400],
	[_T("%%Scan Feature%%"),			0x00000800],
	[_T("%%Scan Setup%%"),			0x00001000],
	[_T("%%Print Setup%%"),			0x00002000],
	[_T("%%System Setup%%"),		0x00004000],	
	[_T("%%Emulation%%"),			0x00008000],
	[_T("%%Image Management%%"),	0x00010000],	
	[_T("%%Network%%"),				0x00020000],    
	[_T("%%Machine Setup%%"),		0x00040000],
	[_T("%%Language%%"),			0x00080000],
	[_T("%%Job Status%%"),			0x00100000],	
	[_T("%%Eco%%"),					0x00200000],
	[_T("%%Direct USB%%"),			0x00400000],
	[_T("%%Job Management%%"),		0x00800000],
	[_T("%%Document Box%%"),		0x01000000],
	[_T("%%PrinterOn%%"),			0x02000000]
]);

