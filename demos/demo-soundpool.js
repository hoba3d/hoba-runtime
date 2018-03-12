// HOBA.SpatialSource demo
// Jari Kleimola 2015-16

// -- button and listbox action handler
function onsoundpool (action)
{
	if (action == "add")
	{
		var id = cursound.selectedIndex+1;
		var sound = cursound.value;
		for (var i=0; i<soundpool.options.length; i++)
			if (soundpool.options[i].innerHTML.indexOf(sound) >= 0) return;
		soundpool.appendChild(new Option(id + " " + sound));

		// -- API
		message.innerHTML = "/sound/" + id + " " + sound + " 1";
		HOBA.addSound(id, "data/"+sound, 1);
	}
	else if (action == "remove")
	{
		var opt = soundpool.options[soundpool.selectedIndex];
		var id  = opt.innerHTML[0];
		var snd = opt.innerHTML.substring(2);
		soundpool.removeChild(opt);
		removesound.disabled = true;
		addsource.disabled = true;
		changesource.disabled = true;
		
		// -- API
		message.innerHTML = "/sound/" + id;
		HOBA.removeSound(id);				
	}
	else if (action == "select")
	{
		removesound.disabled = false;
		addsource.disabled = false;
		changesource.disabled = soundsources.selectedIndex >= 0 ? false : true;
	}
}

// -- OSC handler
function onOSCsoundpool (msg)
{
	if (msg.url)
	{
		for (var i=0; i<soundpool.options.length; i++)
			if (soundpool.options[i].innerHTML[0] == msg.tokens[2]) return;
		var s = msg.tokens[2] + " ";
		s += msg.url.substring(msg.url.indexOf("/")+1);
		soundpool.appendChild(new Option(s));
	}
	else for (var i=0; i<soundpool.options.length; i++)
	{
		var id = soundpool.options[i].innerHTML[0];
		if (id == msg.tokens[2])
			soundpool.removeChild(soundpool.options[i]);
	}
}
