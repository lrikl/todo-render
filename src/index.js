'use strict';

import "./style.css";

const userNameInput = document.getElementById('user-name');
const userSaveBtn = document.getElementById('save-user-name');
userSaveBtn.style.display = "none";
const todoList = document.querySelector('.todo-list');
const todoInput = document.getElementById('todo-main-input'); 
const todoBlock = document.querySelector('.todo-block'); 
const deleteButtonAll = document.getElementById('del-allbtn');
const updateBtn = document.getElementById('update-btn');

let todoTasksArr = []; // Масив для зберігання задач (дані завантажуються з бази даних)

document.addEventListener('DOMContentLoaded', async () => {
    // Отримуємо ім'я користувача
    let userName = localStorage.getItem('userName');

    if (!userName) {
        userName = prompt("Введіть ваше ім'я:");
        if (userName) {
            localStorage.setItem('userName', userName);
        }
    }
    
    userNameInput.value = userName || '';
    
    userNameInput.addEventListener('focus', () => {
        userSaveBtn.style.display = "";
    });
    
    userNameInput.addEventListener('blur', () => {
        setTimeout(() => {
            userSaveBtn.style.display = "none";
        }, 1000);
    });
    
    userSaveBtn.addEventListener('click', () => {
        userName = userNameInput.value.trim();
        if (userName) {
            localStorage.setItem('userName', userName);
            alert("Ім'я збережено!");
        }
    });

    todoTasksArr = await fetchTasks(); // Асинхронно отримуємо задачі з бази даних
    todoTasksArr.forEach(task => addTodoToDOM(task)); // Для кожної задачі додаємо її в DOM

    updateDeleteButtonAll();
});

todoBlock.addEventListener('click', ({ target }) => {

    if (target.id === 'add-todo') {
        addTodo();
    }
    else if (target.classList.contains('delete-item')) {
        deleteTodoItem(target);
    }
    else if (target.classList.contains('edit-item')) {
        handleEdit(target); 
    }
    else if (target.id === 'del-allbtn') {
        clearAllTodos();
    }
});

// додавання по ентеру
todoInput.addEventListener('keydown', ({ key }) => {
    if (key === 'Enter') {
        document.getElementById('add-todo').click();
    }
});

todoList.addEventListener('change', ({ target }) => {
    if (target.classList.contains('done-item')) {
        toggleTodoCompletion(target);
    }
});

async function addTodo() {
    const text = todoInput.value.trim(); 
    if (!text) {
        alert('Текст задачі не може бути пустим');
        return; 
    }

    const userName = localStorage.getItem('userName') || 'Анонім'; // Отримуємо ім'я користувача з localStorage або використовуємо 'Анонім' за замовчуванням

    const newTask = { name: userName, text, completed: false }; // Створюємо об'єкт нової задачі

    const taskFromDB = await addTaskToDB(newTask.name, newTask.text, newTask.completed); // Асинхронно додаємо задачу в базу даних
    if (taskFromDB && taskFromDB._id) { // Якщо задачу успішно додано в базу даних та отримано її _id
        todoTasksArr.push(taskFromDB); // Додаємо задачу в масив задач
        addTodoToDOM(taskFromDB); // Додаємо задачу в DOM
        todoInput.value = ''; 
    }

    updateDeleteButtonAll();
}

function addTodoToDOM(task) {
    const todoItem = document.createElement('li');
    todoItem.classList.add('todo-item');
    todoItem.dataset.id = task._id; // Зберігаємо _id задачі в data-id атрибуті елемента списку

    const taskMainText = document.createElement('div');
    taskMainText.classList.add('todo-main-text');

    const taskText = document.createElement('div');
    taskText.classList.add('todo-p'); 
    taskText.textContent = task.text; 

    const taskName = document.createElement('div'); 
    taskName.classList.add('todo-name'); 
    taskName.textContent = task.name; 

    const taskControls = document.createElement('div');
    taskControls.classList.add('todo-controls');

    const editButton = document.createElement('button'); 
    editButton.classList.add('edit-item'); 

    const doneCheckbox = document.createElement('input'); 
    doneCheckbox.type = 'checkbox'; 
    doneCheckbox.classList.add('done-item'); 
    doneCheckbox.checked = task.completed;

    if (task.completed) {
        todoItem.classList.add('check-bg');
    }else {
        todoItem.classList.remove('check-bg');
    } 

    const deleteButton = document.createElement('button'); 
    deleteButton.classList.add('delete-item'); 
    deleteButton.textContent = 'X'; 

    todoItem.appendChild(taskMainText)
    todoItem.appendChild(taskControls);

    taskMainText.appendChild(taskName);
    taskMainText.appendChild(taskText);

    taskControls.appendChild(editButton);
    taskControls.appendChild(doneCheckbox);
    taskControls.appendChild(deleteButton);

    todoList.prepend(todoItem); 
}

async function deleteTodoItem(button) {
    const todoItem = button.closest('.todo-item'); // Знаходимо найближчий батьківський елемент з класом 'todo-item'
    const taskId = todoItem.dataset.id; // Отримуємо _id задачі з data-id атрибуту

    if (!taskId) {
        return;
    }

    await deleteTaskFromDB(taskId); // Асинхронно видаляємо задачу з бази даних

    todoTasksArr = todoTasksArr.filter(task => task._id !== taskId); // Фільтруємо масив задач, залишаючи тільки ті, у яких _id не співпадає з _id задачі, яку видаляємо
    todoItem.remove(); // Видаляємо елемент списку з DOM
    updateDeleteButtonAll();
}

async function handleEdit(button) {
    debugger
    const todoItem = button.closest('.todo-item');
    const taskId = todoItem.dataset.id; // Отримуємо _id задачі з data-id атрибуту

    if (!taskId) {
        return;
    } 

    const textElement = todoItem.querySelector('.todo-p'); // Отримуємо елемент з текстом задачі
    const currentText = textElement.textContent;

    toggleOtherTodoButtons(todoItem, false); // Приховуємо інші кнопки управління задачею

    const editInput = document.createElement('input');
    editInput.type = 'text'; 
    editInput.value = currentText; 
    editInput.classList.add('todo-input'); 
    
    const saveButton = document.createElement('button'); 
    saveButton.textContent = 'Save'; 
    saveButton.classList.add('save-item'); 

    const todoTextContent = todoItem.querySelector('.todo-main-text');
    todoTextContent.replaceChild(editInput, textElement); // Замінюємо текст задачі на інпут

    todoItem.appendChild(saveButton);
    button.style.display = 'none';

    saveButton.addEventListener('click', async () => {
        const newText = editInput.value.trim();
        if (!newText) {
            alert('Текст задачі не може бути пустим');
            return; 
        }

        await updateTaskInDB(taskId, { text: newText }); // Асинхронно оновлюємо текст задачі в базі даних

        textElement.textContent = newText; 
        todoTextContent.replaceChild(textElement, editInput); // Замінюємо інпут на новий елемент з текстом задачі
        saveButton.remove(); 
        button.style.display = ''; 

        toggleOtherTodoButtons(todoItem, true); // Відображаємо інші кнопки управління задачею
    });
}

async function toggleTodoCompletion(checkbox) {
    const todoItem = checkbox.closest('.todo-item');
    const taskId = todoItem.dataset.id; // Отримуємо _id задачі з data-id атрибуту

    if (!taskId) {
        return;
    } 

    const isCompleted = checkbox.checked;

    await updateTaskInDB(taskId, { completed: isCompleted }); // Асинхронно оновлюємо стан задачі в базі даних

    const task = todoTasksArr.find(task => task._id === taskId); // Знаходимо задачу в масиві задач за _id
    task.completed = isCompleted; // Оновлюємо стан задачі в масиві задач
    if (isCompleted) {
        todoItem.classList.add('check-bg');
    }else {
        todoItem.classList.remove('check-bg');
    } 
}

async function clearAllTodos() {
    todoTasksArr.forEach(task => deleteTaskFromDB(task._id)); // Для кожної задачі в масиві задач асинхронно видаляємо її з бази даних
    todoTasksArr = []; 
    todoList.innerHTML = ''; 

    updateDeleteButtonAll(); 
}

function updateDeleteButtonAll() {
    deleteButtonAll.style.display = todoTasksArr.length > 1 ? '' : 'none'; 
}

function toggleOtherTodoButtons(todoItem, visible) {
    const buttons = todoItem.querySelectorAll('.done-item, .delete-item'); // Отримуємо кнопки виконання та видалення задачі
    buttons.forEach(button => {
        button.style.display = visible ? '' : 'none';
    });
}

async function fetchTasks() {
    try {
        const response = await fetch('/tasks');
        if (!response.ok) throw new Error('Помилка завантаження задач');

        return await response.json(); 
    } catch (error) {
        console.error('Помилка:', error);
        return [];
    }
}

async function addTaskToDB(name, text, completed = false) {
    try {
        const response = await fetch('/tasks', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, text, completed }), 
        });

        return await response.json(); 
    } catch (error) {
        console.error('Помилка додавання задачі:', error);
    }
}

async function deleteTaskFromDB(taskId) {
    try {
        await fetch(`/tasks/${taskId}`, { method: 'DELETE' });
    } catch (error) {
        console.error('Помилка:', error); 
    }
}

async function updateTaskInDB(taskId, updates) {
    try {
        await fetch(`/tasks/${taskId}`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(updates), 
        });
    } catch (error) {
        console.error('Помилка:', error); 
    }
}

// автоматичне оновлення списку
async function updateTasks() {
    try {
        const freshTasks = await fetchTasks();

        todoList.innerHTML = '';
        todoTasksArr = [];

        freshTasks.forEach(task => {
            addTodoToDOM(task);
            todoTasksArr.push(task);
        });

        updateDeleteButtonAll();
    } catch (error) {
        console.error('Помилка при оновленні задач:', error);
    }
}

setInterval(updateTasks, 5000);