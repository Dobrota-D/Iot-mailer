import React, { useState, useEffect } from "react";
import mqtt from "mqtt/dist/mqtt";
import "./App.css";

function BoxMailer() {
  const [nombreDeLettres, setNombreDeLettres] = useState(0);
  const [poids, setPoids] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const handleClick = () => {
    setIsLocked(!isLocked);
    if (isLocked == false) {
      setIsLocked(!isLocked)
      client.publish('mailbox/lock', 'true')    
    } if (isLocked == true) {
      setIsLocked(!isLocked)
      client.publish('mailbox/lock', 'false')
    }
  };

  const ajouterLettre = () => {
    if (!isLocked) {
      setNombreDeLettres(nombreDeLettres + 1);
    }
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

  const client = mqtt.connect('ws://broker.emqx.io:8083/mqtt')

  client.on('connect', function () {
    client.subscribe('mailbox/#', function (err) {
    })
  })

  client.on('message', function (topic, message) {
    // message is Buffer
    console.log(topic, message.toString())
    if (topic.includes( "weight") && !isLocked) {
      setPoids(parseInt(message.toString()))
    }
    if (topic.includes("lock")) {
      if (!isLocked && message.toString() == "true") {
        setIsLocked(true)
      } else if (isLocked && message.toString() == "false") {
        setIsLocked(false)
      }
    }
  })

  return (
    <div className="App">
      <div className="Counter">
        <p className={isLocked ? "disabled" : ""} disabled={isLocked}>Nombre d'entrée : {nombreDeLettres}</p>
      </div>
      <div className="Weight">
        <p className={isLocked ? "disabled" : ""} disabled={isLocked}>Poids actuel: {poids} gr</p>
      </div>
      <div className="Lock">
        <button onClick={handleClick}>
          {isLocked ? 'Déverrouiller la boîte' : 'Verrouiller la boîte'}
        </button>
      </div>
    </div>  
  );
}

export default BoxMailer;
