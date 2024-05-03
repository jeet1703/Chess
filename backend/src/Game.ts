import { Chess } from "chess.js";
import { WebSocket } from "ws";
import { GAME_OVER, INIT_GAME, MOVE } from "./messages";

export class Game {
  public player1: WebSocket;
  public player2: WebSocket;
  public board: Chess;
  private startTime: Date;
  private moveCount: number = 0;

  constructor(player1: WebSocket, player2: WebSocket) {
    this.player1 = player1;
    this.player2 = player2;
    this.board = new Chess();

    this.startTime = new Date();
    this.player1.send(JSON.stringify({
      type: INIT_GAME,
      payload:  {
        color: "white"
      }
    }))
    this.player2.send(JSON.stringify({
      type: INIT_GAME,
      payload:  {
        color: "black"
      }
    }))
  }

  makeMove(
    socket: WebSocket,
    move: {
      from: string;
      to: string;
    }
  ) {
    //validate the type of move using zod
    if (this.moveCount % 2 === 0 && socket != this.player1) {
      return;
    }
    if (this.moveCount % 2 === 1 && socket != this.player2) {
      return;
    }
    try {
      this.board.move(move);
      this.moveCount++;
    } catch (e) {
        return;
    }
    if(this.board.isGameOver()){
        this.player1.emit(JSON.stringify({
            type: GAME_OVER,
            payload: {
                winner: this.board.turn() === "w" ? "black" : "white",
            }
        }))
    }
    if(this.board.moves().length % 2 === 0){
        this.player2.send(JSON.stringify({
            type: MOVE,
            payload: move
        }))
    }else{
        this.player1.send(JSON.stringify({
            type: MOVE,
            payload: move
        }))
    }

    //send the updated board to both players

    //if the game is over send the game over message to both players  


  }
}
