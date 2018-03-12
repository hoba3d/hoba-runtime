// HOBA
// jari kleimola 2015-16

var VisualRenderer = function (containerID)
{
	var scene,cam,renderer,controls,container;
	var geo;
	var grid,lines,point,tri;
	var gridvisible = true;
	var linesvisible = false;
	var pointvisible = false;
	var trivisible = false;
	var rendering = false;
	var self = this;
	var model;
	
	
	// ---------------------------------------------------------------
	// public API
	//	
	this.setHRTFGeometry = function (geo_)
	{
		geo = geo_;
		if (grid)  model.remove(grid);
		if (lines) model.remove(lines);
		addMeasurementGrid();
		addTriangulationLines();
		if (!rendering)
		{
			rendering = true;
			animate();
			render();
		}
	}
	
	this.showGrid = function (onoff)
	{
		if (grid && onoff != gridvisible)
		{
			if (onoff) model.add(grid);
			else model.remove(scene, grid);
			renderer.render(scene, cam);
			gridvisible = onoff;
		}
	}

	this.showLines = function (onoff)
	{
		if (lines && onoff != linesvisible)
		{
			if (onoff) model.add(lines);
			else model.remove(lines);
			renderer.render(scene, cam);
			linesvisible = onoff;
		}
	}

	this.showPosition = function (onoff)
	{
		if (onoff != pointvisible)
		{
			if (onoff) model.add(point);
			else model.remove(point);
			renderer.render(scene, cam);
			pointvisible = onoff;
		}
	}

	this.showTriangle = function (onoff)
	{
		if (onoff != trivisible)
		{
			if (tri)
			{
				if (onoff) model.add(tri);
				else model.remove(tri);
				for (var v=0; v<3; v++)
					cloud.geo.colors[curtriangle[v]].set(onoff ? 0xffffff : 0x3333ff);
				cloud.geo.colorsNeedUpdate = true;
				renderer.render(scene, cam);
			}
			trivisible = onoff;
		}
	}
	
	this.setPosition = function (a,e,index)
	{
		var r = 1;
		e = e / 180 * Math.PI;
		a = a / 180 * Math.PI;
		var z = -r * Math.cos(e) * Math.cos(a);
		var x = r * Math.cos(e) * Math.sin(a);
		var y = r * Math.sin(e);
		point.position.set(-x,y,z);
		if (index != undefined && index >= 0) hiliteTriangle(index);
		renderer.render(scene, cam);
	}
	
	var curtriangle = [0,0,0];
	var trimaterial = new THREE.LineBasicMaterial({ color:0xffffff, linewidth:1 });
	var hiliteTriangle = function (i)
	{
		if (i < 0 || i >= geo.triangles.length) return false;
		
		if (tri) model.remove(tri);
		tri = createTriangle(i, trimaterial);
		tri.scale.set(-1,1,1);
		if (trivisible)
		{
			for (var v=0; v<3; v++)
			{
				var meshcolor = cloud.geo.colors[curtriangle[v]];
				if (meshcolor) meshcolor.set(0x3333ff);
			}
			for (var v=0; v<3; v++)
			{
				var index = geo.triangles[i+v];
				cloud.geo.colors[index].set(0xffffff);
				curtriangle[v] = index;
			}
			cloud.geo.colorsNeedUpdate = true;
			model.add(tri);
			renderer.render(scene, cam);
		}
		else for (var v=0; v<3; v++)
			curtriangle[v] = geo.triangles[i+v];

		return true;
	}
	
	this.redraw = function () { renderer.render(scene, cam); }
	this.resize = function (w,h)
	{
		var containerWidth  = w;
		var containerHeight = h;
		renderer.setSize( containerWidth, containerHeight );
		cam.aspect = containerWidth / containerHeight;
		cam.updateProjectionMatrix();
		renderer.render(scene, cam);
	}

	
	// ---------------------------------------------------------------
	// private methods
	//

	function createTriangle ( triangleIndex, material )
	{
		var i = triangleIndex;
		var p0 = geo.points3D[geo.triangles[ i ]];
		var p1 = geo.points3D[geo.triangles[i+1]];
		var p2 = geo.points3D[geo.triangles[i+2]];
		var A = [ p0[0],p0[1],p0[2] ];
		var B = [ p1[0],p1[1],p1[2] ];
		var C = [ p2[0],p2[1],p2[2] ];

		var geometry = new THREE.Geometry();
		geometry.vertices.push(new THREE.Vector3(A[0],A[1],A[2]));
		geometry.vertices.push(new THREE.Vector3(B[0],B[1],B[2]));
		geometry.vertices.push(new THREE.Vector3(C[0],C[1],C[2]));
		geometry.vertices.push(new THREE.Vector3(A[0],A[1],A[2]));
		var line = new THREE.Line(geometry, material);
		return line;
	}
	
	var addMeasurementGrid = function (onoff)
	{
		if (onoff == undefined) onoff = gridvisible;
		cloud = new ParticleCloud(geo.points3D.length);
		for (var i = 0; i < cloud.count; i++)
		{
			var p = geo.points3D[i];
			var gridPoint = new Particle(p[0], p[1], p[2]);
			cloud.add(gridPoint);
		}
		grid = cloud.createSystem(false);
		grid.scale.set(-1,1,1);
		if (onoff) model.add(grid);
	}
	
	var addTriangulationLines = function (onoff)
	{
		if (onoff == undefined) onoff = linesvisible;
		lines = new THREE.Object3D();
		var material = new THREE.LineBasicMaterial({ color:0x4444ff, linewidth:1 });
		cloud;
		
		for (var i=0; i<geo.triangles.length; i+=3)
		{
			var tri = createTriangle(i, material);
			lines.add(tri);
		}
		if (onoff) model.add(lines);
	}
	
	function createScene ()
	{
		scene = new THREE.Scene();
		scene.fog = new THREE.FogExp2('#222', 0.001);
		self.model = model = new THREE.Object3D();
		model.scale.set(-1,1,1);
		scene.add(model);
		
		var geometry = new THREE.SphereGeometry(0.02, 10, 10); //, 0, Math.PI * 2, 0, Math.PI * 2);
		var material = new THREE.MeshBasicMaterial({ color:0xff8000 });
		point = new THREE.Mesh(geometry, material);
		
		container = document.getElementById(containerID);
		var w = container.clientWidth;
		var h = container.clientHeight;
		cam = new THREE.PerspectiveCamera(75, w/h, 0.001, 1000);
		cam.lookAt(scene.position);
		cam.position.z = 2.5;
		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(w, h);
		renderer.setClearColor('#222', 1);
		document.getElementById(containerID).appendChild(renderer.domElement);
	}
	
	function createControls ()
	{
		controls = new THREE.TrackballControls(cam, renderer.domElement);
		controls.rotateSpeed = 1.2;
		controls.zoomSpeed = 1.2;
		controls.panSpeed = 0.8;
		controls.noZoom = false;
		controls.noPan = false;
		// controls.staticMoving = true;
		controls.dynamicDampingFactor = 0.15;
		controls.keys = [ 65, 83, 68 ];
		controls.addEventListener( 'change', render );
	}
	
	function render() { renderer.render(scene, cam); }
	function animate ()
	{
		requestAnimationFrame(animate);
		controls.update();
	}
	
	createScene();
	createControls();
}

// --------------------------------------------------------
// helper classes for grid visualization
// ParticleCloud geometry consists of Particles
//
var Particle = function (x,y,z)
{
	this.set(x,y,z);
}
Particle.prototype = new THREE.Vector3();
Particle.constructor = Particle;

var ParticleCloud = function (count)
{
	this.count = count;
	this.geo = new THREE.Geometry();
	this.mat = new THREE.PointsMaterial({
		vertexColors: THREE.VertexColors,
		size: 0.04,
		blending: THREE.AdditiveBlending
	});

	this.points = null;
	this.createSystem = function (sort)
	{
		this.points = new THREE.Points(this.geo, this.mat);
		// this.points.sortParticles = sort;
		return this.points;
	}
	this.add = function (p)
	{ 
		this.geo.vertices.push(p);
		this.geo.colors.push(new THREE.Color(0x3333ff));
	}
	this.get = function (i) { return this.geo.vertices[i]; }

	this.update = function () { this.points.geometry.verticesNeedUpdate = true; }
}