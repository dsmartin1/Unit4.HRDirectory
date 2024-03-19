//require('dotenv').config()

const express = require('express')
const app = express()
const pg = require('pg')
const client = new pg.Client(process.env.DATABASE_URL || `postgres://localhost/acme_hr_directory_db`)
const port = process.env.PORT || 3000

app.use(express.json())
app.use(require('morgan')('dev'))

// GET departments
app.get('/api/departments', async (req, res, next) => {
  try {
    const SQL = `
      SELECT * FROM departments;
    `
    const response = await client.query(SQL)
    res.send(response.rows)
  } catch (error) {
    next(error)
  }
})

// GET employees - all
app.get('/api/employees', async (req, res, next) => {
  try {
    const SQL = `
      SELECT * FROM employees ORDER BY created_at DESC;
    `
    const response = await client.query(SQL)
    res.send(response.rows)
  } catch (error) {
    next(error)
  }
})

// GET employees - single, by id
app.get('/api/employees/:id', async (req, res, next) => {
  try {
    const SQL = `
      SELECT * FROM employees 
      WHERE id = $1;
    `
    const response = await client.query(SQL, [req.params.id])
    res.send(response.rows)
  } catch (error) {
    next(error)
  }
})

//  POST employee
app.post('/api/employees', async (req, res, next) => {
  try {
    const SQL = `
      INSERT INTO employees(name, department_id)
        VALUES($1, $2)
        RETURNING *;
    `
    // How can I validate department_id?
    const response = await client.query(SQL, [req.body.name, req.body.department_id])
    res.send(response.rows[0])
  } catch (error) {
    next(error)
  }
})

app.put('/api/employees/:id', async (req, res, next) => {
  try {
    const SQL = `
      UPDATE employees
        SET name=$1, department_id=$2, updated_at= now()
        WHERE id=$3 RETURNING *;
    `
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
      req.params.id
    ])
    res.send(response.rows[0])
  } catch (error) {
    next(error)
  }
})

app.delete('/api/employees/:id', async (req, res, next) => {
  try {
    const SQL = `
      DELETE FROM employees
        WHERE id = $1;
    `
    const response = await client.query(SQL, [req.params.id])
    res.sendStatus(204)
  } catch (error) {
    next(error)
  }
})

const init = async () => {
  await client.connect()
  console.log('connected to server')

  let SQL = `
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS departments;
    CREATE TABLE departments(
      id SERIAL PRIMARY KEY,
      name VARCHAR(100)
    );
    CREATE TABLE employees(
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now(),
      department_id INTEGER REFERENCES departments(id) NOT NULL
    );
  `
  await client.query(SQL)
  console.log('tables created')
  SQL = `
    INSERT INTO departments(name) VALUES('Solutions');
    INSERT INTO departments(name) VALUES('Development');
    INSERT INTO departments(name) VALUES('Sales');
    INSERT INTO employees(name, department_id)
      VALUES('Alice', (SELECT id FROM departments WHERE name='Solutions'));
    INSERT INTO employees(name, department_id)
      VALUES('Bob', (SELECT id FROM departments WHERE name='Development'));
    INSERT INTO employees(name, department_id)
      VALUES('Carol', (SELECT id FROM departments WHERE name='Solutions'));
    INSERT INTO employees(name, department_id)
      VALUES('Dan', (SELECT id FROM departments WHERE name='Development'));
    INSERT INTO employees(name, department_id)
      VALUES('Elizabeth', (SELECT id FROM departments WHERE name='Solutions'));
    INSERT INTO employees(name, department_id)
      VALUES('Frank', (SELECT id FROM departments WHERE name='Sales'));
  `
  await client.query(SQL)
  console.log('data seeded')
  app.listen(port, () => console.log(`listening on port ${port}`))
}

init()