
/* This is similar to Ext Js's namespace function.
  * It is neccessary to create new namespace in application window, not SWS portal window(top)
  */
function ns2() {
    var a=arguments, o=null, i, j, d, rt;
    for (i=0; i<a.length; ++i) {
        d=a[i].split(".");
        rt = d[0];
        eval('if (typeof ' + rt + ' == "undefined"){' + rt + ' = {};} o = ' + rt + ';');
        for (j=1; j<d.length; ++j) {
            o[d[j]]=o[d[j]] || {};
            o=o[d[j]];
        }
    }
}

/* redirect SWS portal & Ext library namespace */

function LoadPortalNameSpace() {
	Ext =  top.Ext;
	SWS =  top.SWS;
	LN = top.LN;
	_T = top._T;

	Ext.applyIf(String, top.String);
	Ext.applyIf(String.prototype, top.String.prototype);

	Ext.applyIf(Array, top.Array);
	Ext.applyIf(Array.prototype, top.Array.prototype);

	Ext.applyIf(Date, top.Date);
	Ext.applyIf(Date.prototype, top.Date.prototype);
	
	Ext.applyIf(Number, top.Number);
	Ext.applyIf(Number.prototype, top.Number.prototype);

	Ext.applyIf(Function, top.Function);
	Ext.applyIf(Function.prototype, top.Function.prototype);

}

LoadPortalNameSpace();
