// HOBA.SpatialSource demo
// Jari Kleimola 2015-16

var cursource;
var lastsourceID = 0;

function resetSource()
{
	cursource.setSPosition(0,0,1);
	cursource.gain = 1;
	setSourceSliders(cursource, true);
}

// -- button and listbox action handler
function onsource (action)
{
	switch (action)
	{
		case "add":
			var sound = soundpool.value.substring(2);
			var soundID  = HOBA.getSoundpoolID(sound);
			var sourceID = lastsourceID++;
			soundsources.appendChild(new Option(sourceID + " " + sound));

			// -- API
			message.innerHTML = "/source/" + sourceID + "/sound " + soundID;
			var srcdef = { pos:{ e:0, a:0 }, sound:soundID };
			HOBA.addSource(new HOBA.SpatialSource(sourceID, srcdef));
			break;
		case "remove":
			var opt = soundsources.options[soundsources.selectedIndex];
			var id  = opt.innerHTML[0];
			soundsources.removeChild(opt);
			removesource.disabled = true;
			stopsource.disabled = true;
			changesource.disabled = true;
			resetsource.disabled	 = true;
			cursource = null;
			setSourceSliders(cursource, false);

			// -- API
			message.innerHTML = "/source/" + id + "/sound -1";
			HOBA.removeSource(id);
			break;
		case "stop":
			var opt = soundsources.options[soundsources.selectedIndex];
			var sourceID = opt.innerHTML[0];

			// -- API
			message.innerHTML = "/source/" + sourceID + "/sound 0";
			HOBA.getSource(sourceID).stop();
			break;
		case "change":
			var opt = soundsources.options[soundsources.selectedIndex];
			var sound = soundpool.value.substring(2);
			var sourceID = opt.innerHTML[0];
			var soundID  = HOBA.getSoundpoolID(sound);
			opt.innerHTML = sourceID + " " + sound;

			// -- API
			message.innerHTML = "/source/" + sourceID + "/sound " + soundID;
			HOBA.getSource(sourceID).sound = soundID;
			break;
		case "select":
			removesource.disabled = false;
			stopsource.disabled	 = false;
			resetsource.disabled	 = false;
			changesource.disabled = soundpool.selectedIndex >= 0 ? false : true;
			setSourceSliders(cursource, true);
			var opt = soundsources.options[soundsources.selectedIndex];
			var sourceID = opt.innerHTML[0];
			cursource = HOBA.getSource(sourceID);
			setSourceSliders(cursource);
			break;
	}
}

// -- slider handler
function onslider (slider)
{
	if (!cursource) return;
	var panner = cursource.panner;

	var w,v = slider.value;
	switch (slider.id)
	{
		case "a":	panner.positionA = w = v; break;
		case "e":	panner.positionE = w = v; break;
		case "r":	panner.positionR = w = v/10; w = w.toFixed(2); break;
		case "x":	panner.positionX = w = v/10; w = w.toFixed(2); break;
		case "y":	panner.positionY = w = v/10; w = w.toFixed(2); break;
		case "z":	panner.positionZ = w = v/10; w = w.toFixed(2); break;
		case "sg":
			// -- API
			w = (v/100).toFixed(2);
			message.innerHTML = "/source/" + cursource.id + "/gain " + w;
			cursource.gain = w;
			break;
	}
	slider.previousElementSibling.innerHTML = w;

	// -- if position was changed, update related cartesian/spherical set
	if (slider.id != "sg")
	{
		var set = slider.parentElement.parentElement.id;
		if (set == "spherical")
		{
			x.value = (panner.positionX * 10) | 0;	x.previousElementSibling.innerHTML = panner.positionX.toFixed(2);
			y.value = (panner.positionY * 10) | 0;	y.previousElementSibling.innerHTML = panner.positionY.toFixed(2);
			z.value = (panner.positionZ * 10) | 0;	z.previousElementSibling.innerHTML = panner.positionZ.toFixed(2);
		}
		else if (set == "cartesian")
		{
			a.value = (panner.positionA) | 0;	a.previousElementSibling.innerHTML = a.value;
			e.value = (panner.positionE) | 0;	e.previousElementSibling.innerHTML = e.value;
			r.value = (panner.positionR * 10) | 0; r.previousElementSibling.innerHTML = panner.positionR.toFixed(2)
		}
	}
}

// -- reflect current model state in sliders
var srccontrols = ["posA","posE","posR","posX","posY","posZ","srcgain"];
function setSourceSliders(src, enable)
{
	if (src) 
	{
		setSlider("posA", src.panner.positionA|0, 1);
		setSlider("posE", src.panner.positionE|0, 1);
		setSlider("posR", src.panner.positionR.toFixed(2), 10);
		setSlider("posX", src.panner.positionX.toFixed(2), 10);
		setSlider("posY", src.panner.positionY.toFixed(2), 10);
		setSlider("posZ", src.panner.positionZ.toFixed(2), 10);
		setSlider("srcgain", src.gain.toFixed(2), 100);
	}
	else for (i in srccontrols)
	{
		var control = document.getElementById(srccontrols[i]);
		var slider  = control.querySelector("input");
		slider.disabled = !enable;
	}
}

// -- OSC handler
function onOSCsource (msg)
{
	if (msg.tokens[3] == "position")
	{
		setSourceSliders(msg.source);
	}
	else if (msg.tokens[3] == "sound")
	{
		if (msg.action == "add")
		{
			var url = HOBA.soundpool[msg.soundid].url;
			var s = msg.source.id + " ";
			s += url.substring(url.indexOf("/")+1);
			soundsources.appendChild(new Option(s));
		}
		else if (msg.action == "remove")
		{
			for (var i=0; i<soundsources.options.length; i++)
			{
				var id = soundsources.options[i].innerHTML[0];
				if (id == msg.tokens[2])
					soundsources.removeChild(soundsources.options[i]);
			}
		}
		else if (msg.action == "change")
		{
			for (var i=0; i<soundsources.options.length; i++)
			{
				var id = soundsources.options[i].innerHTML[0];
				if (id == msg.tokens[2])
				{
					var url = HOBA.soundpool[msg.soundid].url;
					var s = msg.source.id + " ";
					s += url.substring(url.indexOf("/")+1);
					soundsources.options[i].innerHTML = s;
					break;
				}
			}
		}
	}
	else if (msg.tokens[3] == "gain")
	{
		setSlider("srcgain", msg.source.gain.toFixed(2), 100);
	}
}
