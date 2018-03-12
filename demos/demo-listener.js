// HOBA.SpatialSource demo
// Jari Kleimola 2015-16

function resetListener()
{
	HOBA.listener.position = [0,0,0];
	HOBA.listener.front = [0,0,-1];
	HOBA.listener.up = [0,1,0];
	setListenerSliders();
}

// -- combobox selection handler
function loadHRTF (url)
{
	HOBA.loadHRTF("data/" + url).then(
		function () { message.innerHTML = "/listener/hrtf " + url; },
		function ()	{ console.log("HRTF load failed"); });			
}

// -- slider handler
function onlistener (slider)
{
	var set = slider.parentElement.parentElement.id;
	if (set == "listenerpos")
	{
		var v = slider.value / 10;
		var o = HOBA.listener.position;
		var p = [o.x, o.y, o.z];
		switch (slider.id)
		{
			case "lposx": p[0] = v.toFixed(2); break;
			case "lposy": p[1] = v.toFixed(2); break;
			case "lposz": p[2] = v.toFixed(2); break;
		}
		slider.previousElementSibling.innerHTML = v.toFixed(2);

		// -- API
		message.innerHTML = "/listener/position " + p[0]+" "+p[1]+" "+p[2];
		HOBA.listener.position = p;
	}
	else if (set == "listenerfront")
	{
		var v = slider.value / 100;
		var o = HOBA.listener.front;
		var p = [o.x, o.y, o.z];
		switch (slider.id)
		{
			case "frontx": p[0] = v.toFixed(2); break;
			case "fronty": p[1] = v.toFixed(2); break;
			case "frontz": p[2] = v.toFixed(2); break;
		}
		slider.previousElementSibling.innerHTML = v.toFixed(2);

		// -- API
		message.innerHTML = "/listener/front " + p[0]+" "+p[1]+" "+p[2];
		HOBA.listener.front = p;
	}
	else if (set == "listenerup")
	{
		var v = slider.value / 100;
		var o = HOBA.listener.up;
		var p = [o.x, o.y, o.z];
		switch (slider.id)
		{
			case "upx": p[0] = v.toFixed(2); break;
			case "upy": p[1] = v.toFixed(2); break;
			case "upz": p[2] = v.toFixed(2); break;
		}
		slider.previousElementSibling.innerHTML = v.toFixed(2);

		// -- API
		message.innerHTML = "/listener/up " + p[0]+" "+p[1]+" "+p[2];
		HOBA.listener.up = p;
	}
}

// -- reflect current model state in sliders
function setListenerSliders()
{
	var listener = HOBA.listener;
	setSlider("lposX",	listener.position.x.toFixed(2), 10);
	setSlider("lposY",	listener.position.y.toFixed(2), 10);
	setSlider("lposZ",	listener.position.z.toFixed(2), 10);
	setSlider("frontX",	listener.front.x.toFixed(2), 100);
	setSlider("frontY",	listener.front.y.toFixed(2), 100);
	setSlider("frontZ",	listener.front.z.toFixed(2), 100);
	setSlider("upX",		listener.up.x.toFixed(2), 100);
	setSlider("upY",		listener.up.y.toFixed(2), 100);
	setSlider("upZ",		listener.up.z.toFixed(2), 100);
}

// -- OSC handler
function onOSClistener(msg, path)
{
	if (msg.tokens[2] == "hrtf")
	{
		var wavh = path.substring(path.indexOf("/")+1);
		hrtf.value = wavh;
	}
	else setListenerSliders();
}
