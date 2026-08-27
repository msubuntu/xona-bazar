import React from "react";
import '../components_css/main.css'
import cardImg from '../assets/card_p.jpg'

function  Main() {
    return(
        <main className="main">
            <div className="card">
    <div className="img_box">
        <img src={cardImg} alt="" />

        <button className="like">♡</button>
    </div>

    <div className="card_body">

        <div className="old_price">
            <span>14 388.92 UZS</span>
            <p>-8%</p>
        </div>

        <h2>13 189.84 UZS</h2>

        <div className="rating">
            ⭐ 4.9
            <span>6 933 sotib olgan</span>
        </div>

        <p className="title">
            Portativ sayohat chamadoni...
        </p>

    </div>
</div>
        </main>
    )
}

export default Main;
