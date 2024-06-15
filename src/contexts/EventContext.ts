import { createContextProvider } from "@solid-primitives/context";
import { createSignal, createEffect } from "solid-js";
import { createStore } from "solid-js/store";
import { emit, listen, once } from "@tauri-apps/api/event";
import { CarData, CarsData, Position, Positions, State } from "@/types/state.type";
import { MessageData } from "@/types/message.type";


type Values = {
  // connected: boolean;
  // setConnected: Dispatch<SetStateAction<Values["connected"]>>;

  handleMessage: (message: MessageData) => void;
  handleInitial: (message: State) => void;

  state: State | null;
  carsData: CarsData | null;
  positions: Positions | null;

  // setDelay: (delay: number) => void;
  // delay: number;
  // maxDelay: number;

  // pause: () => void;
  // resume: () => void;
};


export const [EventContextProvider, useEventContext] = createContextProvider(
  (props: Values) => {
    const [liveState, setLiveState] = createStore<State>();
    const [carsData, setCarsData] = createStore<CarsData>();
    const [positions, setPositions] = createStore<Positions>();

    const handleInitial = (message: State) => {
      setLiveState(message)
      if (message.carDataZ) {

      }
      if (message.positionZ) {

      }
    }
    
    const handleUpdate = (message: MessageData) => {

    }

    // listen for the initial state
    createEffect(async () => {
      once<State>("initial", (event) => {

      })
    })

    // listen for the updates
    createEffect(async () => {
      const unlisten = await listen<MessageData>("update", (event) => {
        // do something with the event
      });
      return () => unlisten()
    });

    return {
      state: liveState
    };
  },
);
