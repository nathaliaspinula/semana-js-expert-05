import AppController from './src/appController.js';
import ConnectionManager from './src/connectionManager.js';
import ViewManager from './src/viewManager.js';
import DragAndFropManager
 from './src/dragAndDropManager.js';
const API_URL = 'https://localhost:3000/';

const appController = new AppController({
    connectionManager: new ConnectionManager({
        apiUrl: API_URL,
    }),
    dragAndDropManager: new DragAndFropManager(),
    viewManager: new ViewManager()
});

try {
    await appController.initialize();
} catch (error) {
    console.log(error);
}