$( "#cmeter" ).progressbar({
	value: false
});

var roundTo = function(number,places){

	number = Math.pow(10,places) * number;
	number = Math.round(number);
	number = number / Math.pow(10,places);
	
	var s = number.toString();
	if (s.indexOf('.') == -1) s += '.';
	while (s.length < s.indexOf('.') + places+1) s += '0';
	
	return s;
}

ccBar = {};
ccBar.rate = 250;
ccBar.millirate = 0;
ccBar.numeric = 0;
ccBar.total = 0;
ccBar._update = 0;
ccBar._last = new Date().getTime();

ccBar.getRaw = function(){
	$.post("/data",function(data){
		console.log(data);
		ccBar.millirate = data.data.millirate;
		ccBar.numeric = data.data.numeric;
		ccBar.total = data.data.total;
		ccBar.update();
	});
}

ccBar.update = function(){
	clearTimeout(ccBar._update);

	// Get delta
	var now = new Date().getTime();
	var delta = now - ccBar._last;
	ccBar._last = now;
	ccBar.numeric += (delta * ccBar.millirate);

	$( "#cmeter" ).progressbar( "value", ccBar.numeric / ccBar.total * 100 );
	$( "#cmeter .label" ).text( roundTo(ccBar.numeric,3) + " Calories" );

	setTimeout(function(){
		ccBar.update();
	},ccBar.rate)
}

var update = function(hmm){
	//$( "#cmeter" ).progressbar( "value", stats.fraction*100 );
	//$( "#cmeter .label" ).text( roundTo(stats.numeric,3) + " Calories" );
}

ccBar.getRaw();

$(function(){
	$("#menubtn").click(function(){
		if($("#menu").is(":visible")){
			$("#menu").hide("blind");
		} else {
			$("#menu").show("blind");
		}
	})
})