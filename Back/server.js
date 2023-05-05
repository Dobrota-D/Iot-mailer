var SerialPort = require('serialport');
var xbee_api = require('xbee-api');
var C = xbee_api.constants;
require('dotenv').config()
const mqtt = require('mqtt')
const client = mqtt.connect('ws://broker.emqx.io:8083/mqtt')
const minValueVariation = 30;

let lastValue = 0;

client.on('connect', function () { 
  client.subscribe('mailbox/#', function (err) {
    
  })
})

client.on('message', function (topic, message) { 
  console.log(topic, message.toString())
  if (topic == 'mailbox/lock') {
    if (message.toString() == 'true') {
      lightRed();
    } else {
      lightGreen();
    }
  } else if (topic == 'mailbox/weight') {
    if (message.toString() == '1200') {
      lightRed();
    } else {
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
  var frame_obj = { // AT Request to be sent
    type: C.FRAME_TYPE.AT_COMMAND,
    command: "NI",
    commandParameter: [],
  };

  xbeeAPI.builder.write(frame_obj);

  frame_obj = { // AT Request to be sent
    type: C.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST,
    destination64: "FFFFFFFFFFFFFFFF",
    command: "NI",
    commandParameter: [],
  };
  xbeeAPI.builder.write(frame_obj);

});

// All frames parsed by the XBee will be emitted here

// storage.listSensors().then((sensors) => sensors.forEach((sensor) => console.log(sensor.data())))

xbeeAPI.parser.on("data", function (frame) {

  //on new device is joined, register it

  //on packet received, dispatch event
  //let dataReceived = String.fromCharCode.apply(null, frame.data);
  if (C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET === frame.type) {
    console.log("C.FRAME_TYPE.ZIGBEE_RECEIVE_PACKET");
    let dataReceived = String.fromCharCode.apply(null, frame.data);
    console.log(">> ZIGBEE_RECEIVE_PACKET >", dataReceived);

  }

  if (C.FRAME_TYPE.NODE_IDENTIFICATION === frame.type) {
    // let dataReceived = String.fromCharCode.apply(null, frame.nodeIdentifier);
    console.log("NODE_IDENTIFICATION");
    //storage.registerSensor(frame.remote64)

  } else if (C.FRAME_TYPE.ZIGBEE_IO_DATA_SAMPLE_RX === frame.type) {

    console.log("ZIGBEE_IO_DATA_SAMPLE_RX")
    console.log(frame.analogSamples.AD1)
    let dataReceived = parseInt(frame.analogSamples.AD1);
    
    if (dataReceived == 1200) {
      lastValue = dataReceived;
      client.publish('mailbox/weight', '1200')
      client.publish('mailbox/lock', 'true')
    } else if (dataReceived == 0 && lastValue != 0) {
      lastValue = 0;
      client.publish('mailbox/weight', '0')
      client.publish('mailbox/lock', 'false')
    } else if (dataReceived > lastValue && (dataReceived - lastValue) > minValueVariation) {
      lastValue = dataReceived;
      client.publish('mailbox/weight', (dataReceived ).toString())
    } 
   

  } else if (C.FRAME_TYPE.REMOTE_COMMAND_RESPONSE === frame.type) {
    console.log("REMOTE_COMMAND_RESPONSE", frame)
  } else {
    console.debug(frame);
    let dataReceived = String.fromCharCode.apply(null, frame.commandData)
    console.log(dataReceived);
  }

});
