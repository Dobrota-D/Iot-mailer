var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
var C = xbee_api.constants;
require('dotenv').config()
const mqtt = require('mqtt')
const client = mqtt.connect('ws://broker.emqx.io:8083/mqtt')
const minValueVariation = 25;
const initialWeight = 335;
const ratioWeightPoint = 2;

let lastValue = initialWeight;

let lock = false; 

client.on('connect', function () { 
  client.subscribe('mailbox/#', function (err) {
    if (err) {
      console.log("Can't subscribe to mailbox/#", err);
    }
  })
})

client.on('message', function (topic, message) { 
  if (topic == 'mailbox/lock') {
    if (message.toString() == 'true') {
      lock = true;
      lightRed();
    } else {
      lock = false;
      lightGreen();
    }
  }
})

const SERIAL_PORT = process.env.SERIAL_PORT;

var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 2
});

let serialport = new SerialPort(SERIAL_PORT, {
  baudRate: parseInt(process.env.SERIAL_BAUDRATE) || 9600,
}, function (err) {
  if (err) {
    return console.log('Error: ', err.message)
  }
});

serialport.pipe(xbeeAPI.parser);
xbeeAPI.builder.pipe(serialport);

let switch_off_red_frame = {
    type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
    destination64: "0013a20041642063",
    command: "D0",
    commandParameter: [ "05" ],
};
let switch_on_red_frame = {...switch_off_red_frame, commandParameter: [ "04" ] };
let switch_off_green_frame = {...switch_off_red_frame, command: "D3" };
let switch_on_green_frame = { ...switch_off_green_frame, commandParameter: [ "04" ] };

const lightRed = () => {
  xbeeAPI.builder.write(switch_on_red_frame);
  xbeeAPI.builder.write(switch_off_green_frame);
}

const lightGreen = () => { 
  xbeeAPI.builder.write(switch_off_red_frame);
  xbeeAPI.builder.write(switch_on_green_frame);
}

serialport.on("open", function () {
  
  lightGreen();

  frame_obj = { // AT Request to be sent
    type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
    destination64: "FFFFFFFFFFFFFFFF",
    command: "NI",
    commandParameter: [],
  };
  xbeeAPI.builder.write(frame_obj);

});


xbeeAPI.parser.on("data", function (frame) {

  //on new device is joined, register it

  //on packet received, dispatch event
  //let dataReceived = String.fromCharCode.apply(null, frame.data);
  // if (C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET === frame.type) {
  //   let dataReceived = String.fromCharCode.apply(null, frame.data);
  // }

  if (C.FRAME_TYPE.NODE_IDENTIFICATION === frame.type) {
    // let dataReceived = String.fromCharCode.apply(null, frame.nodeIdentifier);
    console.log("NODE_IDENTIFICATION");
    //storage.registerSensor(frame.remote64)

  } else if (C.FRAME_TYPE.ZIGBEE_IO_DATA_SAMPLE_RX === frame.type) {

    console.log("ZIGBEE_IO_DATA_SAMPLE_RX")
    console.log(frame.analogSamples.AD1)
    let dataReceived = parseInt(frame.analogSamples.AD1);
    if (dataReceived <= initialWeight && lastValue != initialWeight) {
      lastValue = initialWeight;
      client.publish('mailbox/weight', '0')
      client.publish('mailbox/lock', 'false')
    }
    else if (!lock && dataReceived == 1200) {
      lastValue = dataReceived;
      client.publish('mailbox/weight', ((dataReceived - initialWeight) / ratioWeightPoint).toString())
      client.publish('mailbox/lock', 'true')
    } else if (!lock && dataReceived > lastValue && (dataReceived - lastValue) > minValueVariation) {
      lastValue = dataReceived;
      client.publish('mailbox/weight', ((dataReceived - initialWeight) / ratioWeightPoint ).toString())
    }
   

  } else if (C.FRAME_TYPE.REMOTE_COMMAND_RESPONSE === frame.type) {
    console.log("REMOTE_COMMAND_RESPONSE", frame)
  } else {
    console.debug(frame);
    let dataReceived = String.fromCharCode.apply(null, frame.commandData)
    console.log(dataReceived);
  }

});
