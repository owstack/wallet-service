function parseFn(raw) {
    return [{
        code: 'USD',
        value: parseFloat(raw.last)
    }];
};

const provider = {
    name: 'Bitstamp',
    currency: {
	    BCH: {
		    url: 'https://www.bitstamp.net/api/v2/ticker/bchusd',
		    parseFn: parseFn    	
	    },
	    BTC: {
		    url: 'https://www.bitstamp.net/api/v2/ticker/btcusd',
		    parseFn: parseFn    	
	    },
	    LTC: {
		    url: 'https://www.bitstamp.net/api/v2/ticker/ltcusd',
		    parseFn: parseFn    	
	    }
	  }
};
module.exports = provider;
