// HOBA
// jari kleimola 2015-16
// using THREE.js vectors for cartesian->spherical conversion

HOBA = window.HOBA || {};
HOBA.AudioListener = function ()
{
	var position = new THREE.Vector3(0,0,0);
	var front = new THREE.Vector3(0,0,-1);
	var up = new THREE.Vector3(0,1,0);
	var self = this;
	
	Object.defineProperty(this, "position", {
		get: function() { return position; },
		set: function (v) { position.set(v[0], v[1], v[2]); HOBA._updateSources(); }
	});
	Object.defineProperty(this, "front", {
		get: function() { return front; },
		set: function (v) { front.set(v[0], v[1], v[2]); HOBA._updateSources(); }
	});
	Object.defineProperty(this, "up", {
		get: function() { return up; },
		set: function (v) { up.set(v[0], v[1], v[2]); HOBA._updateSources(); }
	});

	
	// -- http://www.w3.org/TR/webaudio/#Spatialization
	this.cartesian2spherical = function (x,y,z)
	{
		var s = { a:0, e:0, r:0 };		
		var src = new THREE.Vector3(x,y,z);
		
		var sourceListener = new THREE.Vector3();
		sourceListener.subVectors(src, position);
		s.r = sourceListener.length();
		if (s.r == 0) return s;
		sourceListener.normalize();
		
		// -- align axes
		var listenerRight = new THREE.Vector3();
		listenerRight.copy(front);
		listenerRight.cross(up);
		listenerRight.normalize();
		var listenerFrontNorm = new THREE.Vector3();
		listenerFrontNorm.copy(front);		
		listenerFrontNorm.normalize();

		var up1 = new THREE.Vector3();
		up1.crossVectors(listenerRight, listenerFrontNorm);
		var upProjection = sourceListener.dot(up1);
		
		var projectedSource = new THREE.Vector3();
		var up2 = new THREE.Vector3(up1.x, up1.y, up1.z);
		up2.multiplyScalar(upProjection);
		projectedSource.subVectors(sourceListener,up2);
		projectedSource.normalize();
		
		s.a = 180 * Math.acos(projectedSource.dot(listenerRight)) / Math.PI;

		// -- source in front or behind the listener
		var frontBack = projectedSource.dot(front);
		if (frontBack < 0) s.a = 360 - s.a;

		// -- make azimuth relative to "front" and not "right" listener vector.
		if ((s.a >= 0) && (s.a <= 270)) s.a = 90 - s.a;
		else s.a = 450 - s.a;

		s.e = 90 - 180 * Math.acos(sourceListener.dot(up1)) / Math.PI;
		if (s.e > 90) s.e = 180 - s.e;
		else if (s.e < -90) s.e = -180 - s.e;

		return s;
	}
	
	this.spherical2cartesian = function (a,e,r)
	{
		if (a < 0) a += 360;
		var phi   = Math.PI * (a/180);
		var theta = Math.PI * (e/180);
		
		var c = {};
		c.x = r * Math.cos(theta) * Math.sin(phi);
		c.y = r * Math.sin(theta);
		c.z = - r * Math.cos(theta) * Math.cos(phi);
		return c;
	}
}

HOBA.listener = new HOBA.AudioListener();
