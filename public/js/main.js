$( "#cmeter" ).progressbar({
	value: false
});


$.CalorieCharge = function(){

	var defaultDailyRate = 1700;

	this._getOrCreateLS = function(name,def){
		var x = localStorage.getItem(name);
		if(x === null){
			localStorage.setItem(name, def);
			return def;
		}
		return x;
	}
	this._setLS = function(name,def){
		localStorage.setItem(name, def);
		console.log("setting",name,"to",def);
	}
	this._modLS = function(name,x){
		var orig = this._getOrCreateLS(name,0);
		this._setLS(name, parseFloat(orig)+parseFloat(x));
	}

	this.getDailyRate = function(){
		return this._getOrCreateLS("dailyChargeRate",defaultDailyRate);
	}
	this.getMilliRate = function(){
		var daily = this._getOrCreateLS("dailyChargeRate",defaultDailyRate);
		var hourly = daily / 24;
		var minutely = hourly / 60;
		var secondly = minutely / 60;
		var millily = secondly / 1000;
		return millily;
	}
	this.getCurrent = function(modify){
	
		// Get time since last check, and update "last" to be now.
		var last = this._getOrCreateLS("lastCheck",new Date().getTime());
		var now = new Date().getTime();
		var delta = now - last;
		
		if(modify) this._setLS("lastCheck",now);
		
		//delta represents the millis passed since the last check. 
		// Take milli rate and multiply.
		var charged = delta * this.getMilliRate();
		var value = parseFloat(this._getOrCreateLS("currentCharge",this.getDailyRate())) + charged;
		value = Math.min(this.getDailyRate(),value);
		
		if(modify) this._setLS("currentCharge",value);
		
		// Return Current after accounting for timechanges.
		return {
			numeric: value,
			fraction: ( value / this.getDailyRate() )
		}
	}
}

var roundTo = function(number,places){

	number = Math.pow(10,places) * number;
	number = Math.round(number);
	number = number / Math.pow(10,places);
	
	var s = number.toString();
	if (s.indexOf('.') == -1) s += '.';
	while (s.length < s.indexOf('.') + places+1) s += '0';
	
	return s;
}

var cc = new $.CalorieCharge();

$(function() {
    $(window).focus(function() {
        window.hasFocus = true;
    });

    $(window).blur(function() {
        window.hasFocus = false;
    });
	
	window.hasFocus = true;
});

var update = function(hmm){
	var stats = cc.getCurrent(hmm);
	$( "#cmeter" ).progressbar( "value", stats.fraction*100 );
	$( "#cmeter .label" ).text( roundTo(stats.numeric,3) + " Calories" );
}

update(true);
setInterval(function(){
	update(false);
},250);
