// interface Game{
//     id: number;
//     name: string;
//     player1:WebSocket;
//     player2:WebSocket;
// }

import { WebSocket } from "ws";
import { Game } from "./Game";
import { INIT_GAME, MOVE } from "./messages";



export class GameManager{
    private games: Game[];
    private pendingUsers : WebSocket | null;
    private users : WebSocket[];


    constructor(){
        this.games = [];
        this.pendingUsers = null;
        this.users = [];
    }

    addUser(socket : WebSocket){
        this.users.push(socket);
        this.handleMessage(socket);
    }

    removeUser(socket : WebSocket){
        this.users = this.users.filter(user => user !== socket);
        //stop game cause user left
    }
    private handleMessage(socket : WebSocket){
        socket.on("message" , data => {
            const message = JSON.parse(data.toString());
            
            if(message.type === INIT_GAME){
                if(this.pendingUsers){
                    //start a game 
                    const game = new Game(this.pendingUsers , socket);
                    this.games.push(game);
                    this.pendingUsers = null;

                }
                else{
                    this.pendingUsers = socket;
                }
            }

            if(message.type === MOVE){
                const game = this.games.find(game => game.player1 === socket || game.player2 === socket);
                if(game){
                    game.makeMove(socket, message.move)
                }
            }
                
        })
    }
}