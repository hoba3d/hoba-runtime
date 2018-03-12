// HOBA
// jari kleimola 2015-16
//
// classes implementing Web Audio API functionality
// HOBA.AudioNode			-- abstract fake AudioNode
// HOBA.PannerBase		-- abstract fake SpatialPanner
// HOBA.DistanceModel	-- helper for source distance computation
// HOBA.ConeModel			-- helper for source directivity computation

// ------------------------------------------------------------------
// implements fake Web Audio API AudioNode interface (as of 2016-05-04)
// this is an abstract class, which HOBA.PannerBase inherits
// see http://www.w3.org/TR/webaudio/#idl-def-AudioNode
//
HOBA = window.HOBA || {};
HOBA.AudioNode = function ()
{
	this.input  = null;
	this.output = null;	
}

HOBA.AudioNode.prototype =
{
	connect: function (dst, outport, inport)
	{
		outport = outport || 0, inport = inport || 0;
		this.output.connect(dst, outport, inport);
	},
	disconnect: function (dst, outport, inport)
	{
		dst = dst || null, outport = outport || 0, inport = inport || 0;
		this.output.disconnect(dst, outport, inport);
	},
}

Object.defineProperties( HOBA.AudioNode.prototype, {
	context:						{ get: function() { return HOBA.audioContext; } },
	numberOfInputs:			{ get: function() { return 1; } },
	numberOfOutputs:			{ get: function() { return 1; } },
	channelCount:				{ get: function() { return 2; } },
	channelCountMode:			{ get: function() { return "clamped-max"; } },
	channelInterpretation:	{ get: function() { return "speakers"; } }
	});


// ------------------------------------------------------------------
// implements fake Web Audio API SpatialPannerNode interface (as of 2016-05-04)
// this is an abstract class, which HOBA.SpatialPanner inherits
// see http://www.w3.org/TR/webaudio/#the-spatialpannernode-interface
//
HOBA.PannerBase = function ()
{
	this.posc = { x:0, y:0, z:-1 };
	this.orientc = { x:0, y:0, z:0 };
	this._distance = new HOBA.DistanceModel();
	this._cone = new HOBA.ConeModel();
}
HOBA.PannerBase.prototype = Object.create(HOBA.AudioNode.prototype);

Object.defineProperties( HOBA.PannerBase.prototype, {
	panningModel:	{ get: function() { return "HRTF"; } },
	positionX: {
		get: function()	{ return this.posc.x; },
		set: function (v) { this._setPosC("x", v); }},
	positionY: {
		get: function()	{ return this.posc.y; },
		set: function (v) { this._setPosC("y", v); }},
	positionZ: {
		get: function()	{ return this.posc.z; },
		set: function (v) { this._setPosC("z", v); }},
	orientationX: {
		get: function()	{ return this.orientc.x; },
		set: function (v) { this._setOrientC("x", v); }},
	orientationY: {
		get: function()	{ return this.orientc.y; },
		set: function (v) { this._setOrientC("y", v); }},
	orientationZ: {
		get: function()	{ return this.orientc.z; },
		set: function (v) { this._setOrientC("z", v); }},
	distanceModel: {
		get: function()	{ return this._distance.model; },
		set: function (v) { this._setDistance("model", v); }},
	refDistance: {
		get: function()	{ return this._distance.refDistance; },
		set: function (v) { this._setDistance("refDistance", v); }},
	maxDistance: {
		get: function()	{ return this._distance.maxDistance; },
		set: function (v) { this._setDistance("maxDistance", v); }},
	rolloffFactor: {
		get: function()	{ return this._distance.rolloffFactor; },
		set: function (v) { this._setDistance("rolloffFactor", v); }},
	coneInnerAngle: {
		get: function()	{ return this._cone.innerAngle; },
		set: function (v) { this._setCone("innerAngle", v); }},
	coneOuterAngle: {
		get: function()	{ return this._cone.outerAngle; },
		set: function (v) { this._setCone("outerAngle", v); }},
	coneOuterGain: {
		get: function()	{ return this._cone.outerGain; },
		set: function (v) { this._setCone("outerGain", v); }},
});

// -- carry-overs from the deprecated Web Audio API PannerNode spec
// -- current SpatialPannerNode spec excludes these methods
// -- I find them useful when all coordinates are to be updated, so here they are
HOBA.PannerBase.prototype.setCPosition = function (x,y,z)
{
	this.posc.x = x;
	this.posc.y = y;
	this.posc.z = z;
	return this._update("position");
}
HOBA.PannerBase.prototype.setOrientation = function (x,y,z)
{
	this.orientc.x = x;
	this.orientc.y = y;
	this.orientc.z = z;
	this._update("orientation");
}

// -- setter helpers
HOBA.PannerBase.prototype._setPosC = function (key, value)
{
	this.posc[key] = value;
	this._update("position");
}
HOBA.PannerBase.prototype._setOrientC = function (key, value)
{
	this.orientc[key] = value;
	this._update("orientation");
}
HOBA.PannerBase.prototype._setDistance = function (key, value)
{
	this._distance[key] = value;
	this._update("distance");
}
HOBA.PannerBase.prototype._setCone = function (key, value)
{
	this._cone[key] = value;
	this._update("cone");
}
// overridden in HOBA.SpatialPanner
HOBA.PannerBase.prototype._update = function (type) {}


// ------------------------------------------------------------------
// from Chrome Distance.cpp/h (which is compatible with OpenAL spec)
//
HOBA.DistanceModel = function ()
{
	this.model = "inverse";
	this.refDistance  = 1;
	this.maxDistance  = 10000;
	this.rolloffFactor = 1;
}
HOBA.DistanceModel.prototype =
{
	gain: function (distance)
	{
		var d = Math.min(distance, this.maxDistance);
		d = Math.max(d, this.refDistance);
		switch (this.model)
		{
			case "linear":  return (1 - this.rolloffFactor * (d - this.Distance) / (this.maxDistance - this.refDistance));
			case "inverse": return this.refDistance / (this.refDistance + this.rolloffFactor * (d - this.refDistance));
			case "exponential": return Math.pow(d / this.refDistance, -this.rolloffFactor);
			default: return 0;
		}
	}
}

// ------------------------------------------------------------------
// from Chrome Cone.cpp/h (which is compatible with OpenAL spec)
//
HOBA.ConeModel = function ()
{
	this.innerAngle = 360;
	this.outerAngle = 360;
	this.outerGain = 0;
}
HOBA.ConeModel.prototype =
{
	gain: function (pos, orient)
	{
		if (orient.x == 0 && orient.y == 0 && orient.z == 0) return 1;
		if ((this.innerAngle == 360) && (this.outerAngle == 360)) return 1;
		
		var sourcepos = new THREE.Vector3(pos.x, pos.y, pos.z);
		var sourceListener = new THREE.Vector3();
		sourceListener.subVectors(HOBA.listener.position, sourcepos);
		sourceListener.normalize();		
		var orientNorm = new THREE.Vector3(orient.x, orient.y, orient.z);
		orientNorm.normalize();
		
		var dot = sourceListener.dot(orientNorm);
		var angle = 180 * Math.acos(dot) / Math.PI;
		var absAngle = Math.abs(angle);		
		var absInnerAngle = Math.abs(this.innerAngle) / 2;
		var absOuterAngle = Math.abs(this.outerAngle) / 2;
		
		var g;
		if (absAngle <= absInnerAngle) g = 1;
		else if (absAngle >= absOuterAngle) g = this.outerGain;
		else
		{
			var x = (absAngle - absInnerAngle) / (absOuterAngle - absInnerAngle);
			g = (1-x) + this.outerGain * x;
		}
		return g;
	}
}
