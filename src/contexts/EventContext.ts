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

// // Create a context to hold the value
// const MyContext = createContext();

// // Function to create and update context state
// function useMyContext() {
//   const [value, setValue] = createSignal('Initial Value');

//   // Use createEffect to listen to Tauri events
//   createEffect(() => {
//     // Example: Listen to 'myEventName' from Tauri
//     const handler = (event) => {
//       setValue(event.payload); // Assuming payload contains the new value
//     };

//     // Subscribe to the event
//     window.tauri.event.listen('myEventName', handler);

//     // Clean up the effect
//     return () => {
//       window.tauri.event.remove('myEventName', handler);
//     };
//   });

//   return { value };
// }

// // Example usage in a component
// function MyComponent() {
//   const { value } = useMyContext();

//   return (
//     <div>
//     <p>Value from context: { value() } </p>
//       < /div>
//   );
// }

// // Wrap your application with the context provider
// function App() {
//   return (
//     <MyContext.Provider>
//     <MyComponent />
//     < /MyContext.Provider>
//   );
// }

// export default App;
