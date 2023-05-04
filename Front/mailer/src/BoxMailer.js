import React, { useState } from "react";

function BoxMailer() {
  const [nombreDeLettres, setNombreDeLettres] = useState(0);
  const [poids, setPoids] = useState(0);

  const ajouterPoids = (nouveauPoids) => {
    setPoids(poids + nouveauPoids);
  };

  const ajouterLettre = () => {
    setNombreDeLettres(nombreDeLettres + 1);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nouveauPoids = Number(event.target.elements.poids.value);
    ajouterPoids(nouveauPoids);
    ajouterLettre();
  };

  return (
    <div className="App">
      <div className="Counter">
      <p>Nombre d'entrée : {nombreDeLettres}</p>
      <form onSubmit={handleSubmit}></form>
      </div>
      <div className="Weight">
        <p>Poids actuel: {poids} gr</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="poids">Ajouter du poids:</label>
          <input id="poids" type="number" />
          <button type="submit">Ajouter</button>
        </form>
      </div>
    </div>  
  );
}

export default BoxMailer;