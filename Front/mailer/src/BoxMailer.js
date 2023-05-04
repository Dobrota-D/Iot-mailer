import React, { useState, useEffect } from "react";
import mqtt from "mqtt/dist/mqtt";

function BoxMailer() {
  const [nombreDeLettres, setNombreDeLettres] = useState(0);
  const [poids, setPoids] = useState(0);

  const ajouterLettre = () => {
    setNombreDeLettres(nombreDeLettres + 1);
  };

  useEffect(() => {
    if (poids > 0) {
      ajouterLettre();
    } else if (poids === 0){
      setNombreDeLettres(0);
    }
    localStorage.setItem("poids", poids)
    localStorage.setItem("nombreDeLettres", nombreDeLettres)
  }, [poids])

  const client  = mqtt.connect('ws://broker.emqx.io:8083/mqtt')

  client.on('connect', function () {
    client.subscribe('mailbox/#', function (err) {
    })
  })

  client.on('message', function (topic, message) {
    // message is Buffer
    console.log(topic, message.toString())
    if (topic.includes( "weight")) {
      setPoids(parseInt(message.toString()))
    }
  })

  return (
    <div className="App">
      <div className="Counter">
      <p>Nombre d'entrée : {nombreDeLettres}</p>
      </div>
      <div className="Weight">
        <p>Poids actuel: {poids} gr</p>
      </div>
    </div>  
  );
}

export default BoxMailer;