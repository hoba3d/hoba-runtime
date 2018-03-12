// HOBA
// jari kleimola 2015-16

HOBA = window.HOBA || {};
HOBA.OSCClient = function (url, callback)
{
	var port;

	function init()
	{
		port = new osc.WebSocketPort({ url: url });
		port.on("message", function (msg)
		{
			var tokens = msg.address.split('/');
			
			// ---- SOURCE
			if (tokens[1] == "source")
			{
				var src = HOBA.getSource(msg.address);
				if (src)
				{
					switch (tokens[tokens.length-1])
					{
						case "position":
							var a,e,r,index;
							if (msg.args[0] == "c")
							{
								var x = msg.args[1], y = msg.args[2], z = msg.args[3];
								var s = src.setCPosition(x,y,z);
								a = s.azimuth;
								e = s.elevation;
								r = s.r;
								index = s.index;
							}
							else
							{
								a = msg.args[1]; e = msg.args[2]; r = msg.args[3];
								index = src.setSPosition(a,e,r, true);
							}
							var m = { tokens:tokens, source:src, index:index,
										 azimuth: a, elevation:e, distance:r };
							break;
						case "sound":
							var m = { source:src, tokens:tokens };
							var id = msg.args[0];
							if (id == -1)
							{
								m.action = "remove";
								HOBA.removeSource(src.id);
							}
							else if (id == 0)
							{
								m.action = "stop";
								src.stop();
							}
							else
							{
								m.action = "change";
								m.soundid = id;
								src.sound = id;
							}
							break;
						case "gain":
							src.gain = msg.args[0];
							var m = { source:src, tokens:tokens };
							break;
					}
					callback(m, msg);
				}
				else
				{
					// -- by convention, "/source/N/sound" adds new source
					// -- if "/source/N" does not yet exist
					if (tokens[tokens.length-1] == "sound")
					{
						var srcdef = { pos:{ e:0, a:0 }, sound:msg.args[0] };
						var src = new HOBA.SpatialSource(tokens[2], srcdef);
						HOBA.addSource(src);
						var m = { action:"add", tokens:tokens, source:src, soundid:msg.args[0] };
						callback(m, msg);
					}
					else console.log("unknown source:", msg.address);						
				}
			}
			
			// ---- LISTENER
			else if (tokens[1] == "listener")
			{
				var m = { tokens:tokens };
				if (tokens[2] == "position") HOBA.listener.position = msg.args;
				else if (tokens[2] == "front") HOBA.listener.front = msg.args;
				else if (tokens[2] == "up") HOBA.listener.up = msg.args;
				else if (tokens[2] == "hrtf")
				{
					HOBA.loadHRTF(msg.args[0]).then( function (geo)
					{
						m.geo = geo;
						callback(m, msg);
					});
					return;
				}
				callback(m, msg);
			}
			
			// ---- SOUND
			else if (tokens[1] == "sound")
			{
				var url = msg.args[0];
				if (url) HOBA.addSound(tokens[2], url, msg.args[1]);
				else HOBA.removeSound(tokens[2]);
				var m = { tokens:tokens, url:url };
				callback(m, msg);
			}
		});
		port.onopen = function() { console.log("opened"); }
	}
	init();
	
	this.start = function () { port.open();  }
	this.stop  = function () { port.close(); }
}
