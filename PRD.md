# PRD — GAS MODULAR CRUD FRAMEWORK

**Product:** GAS Modular CRUD Framework  
**Platform:** Google Apps Script Web App  
**Database:** Google Spreadsheet  
**Frontend:** HTML + CSS + Vanilla JavaScript  
**Architecture:** Modular, Configuration-Driven, Generic CRUD, Deep Modules  
**Status:** Architecture & Implementation Specification

---

# 1. Product Overview

GAS Modular CRUD Framework adalah framework ringan untuk membangun aplikasi internal berbasis **Google Apps Script Web App** dengan Google Spreadsheet sebagai database.

Framework dirancang agar:

- modular
- reusable
- configuration-driven
- mudah dikembangkan
- mudah diuji
- mudah dipahami manusia
- mudah dinavigasi oleh AI coding agent
- meminimalkan duplikasi
- menjaga Spreadsheet-specific logic tetap terlokalisasi
- memungkinkan penambahan entity baru tanpa menulis ulang generic CRUD
- dapat berkembang tanpa menjadi framework yang terlalu kompleks

Framework menggunakan prinsip **deep modules**.

Tujuan bukan membuat sebanyak mungkin abstraction, tetapi membuat module yang:

- memiliki interface sederhana
- menyembunyikan kompleksitas nyata
- memiliki locality yang baik
- memberikan leverage tinggi
- mudah diuji melalui seam yang jelas

---

# 2. Problem Statement

Pengembangan aplikasi GAS sering berkembang menjadi kumpulan file `.gs` dan `.html` yang saling memanggil secara langsung.

Contoh masalah:

```text
Tab_Users
   └── google.script.run
          └── SpreadsheetApp

Tab_Products
   └── google.script.run
          └── SpreadsheetApp

UserService
   └── getSheetByName()

ProductService
   └── getSheetByName()

UserRepository
   └── getRange()

ProductRepository
   └── getRange()
```

Akibatnya:

- logic CRUD berulang
- Spreadsheet logic bocor ke berbagai module
- frontend mengetahui detail backend
- entity baru membutuhkan banyak perubahan
- validation tersebar
- table configuration berulang
- form configuration berulang
- testing sulit
- perubahan kecil membutuhkan pemahaman terlalu banyak file
- AI coding agent membutuhkan context yang terlalu besar

Framework harus mengatasi masalah tersebut tanpa memperkenalkan complexity yang tidak diperlukan.

---

# 3. Product Goals

## 3.1 Primary Goals

Framework harus:

1. menyediakan generic CRUD
2. menyediakan Schema sebagai source of truth
3. menyediakan reusable Table
4. menyediakan reusable Form
5. menyediakan reusable Modal
6. menyediakan reusable Pagination
7. menyediakan reusable Toast
8. menyediakan reusable Loading state
9. menyediakan frontend API abstraction
10. menyediakan Repository abstraction
11. menyediakan Database abstraction
12. menyediakan centralized validation
13. menyediakan standardized response
14. menyediakan centralized error handling
15. menggunakan Spreadsheet header mapping
16. menyediakan automatic ID generation
17. menyediakan timestamps
18. menggunakan LockService pada operasi yang membutuhkan concurrency protection
19. menjaga separation of concerns
20. memudahkan penambahan entity baru

---

# 4. Architecture Goals

Framework tidak hanya mengejar modularity.

Framework harus mengoptimalkan:

### Depth

Module harus menyembunyikan complexity yang nyata.

### Locality

Perubahan terhadap suatu konsep harus terjadi pada area yang kecil dan mudah ditemukan.

### Leverage

Satu generic module harus dapat melayani banyak entity.

### Seam

Module harus memiliki titik pemisah yang memungkinkan implementation diganti atau diuji secara independen.

### Adapter

Adapter digunakan ketika terdapat perbedaan interface nyata antara dua environment.

Contoh:

```text
Frontend API
      ↓
google.script.run
```

### AI Navigability

AI coding agent harus dapat menemukan lokasi perubahan dengan cepat.

Menambahkan Product idealnya cukup memahami:

```text
ProductSchema
ProductRepository
ProductService
ProductController
Tab_Products
```

tanpa harus memahami seluruh framework.

---

# 5. Non-Goals

Framework tidak bertujuan menjadi:

- React framework
- Vue framework
- Angular framework
- TypeScript framework
- ORM
- dependency injection framework
- state management framework
- microservice framework
- enterprise Java-style architecture
- full frontend SPA framework
- build system
- NPM-based framework

Jangan menambahkan dependency jika Vanilla JS atau GAS native sudah cukup.

---

# 6. Core Architecture

## 6.1 Backend

```text
Controller
    │
    ▼
 Service
    │
    ▼
Repository
    │
    ▼
 Database
    │
    ▼
Google Spreadsheet
```

## 6.2 Frontend

```text
Main
 │
 ├── Tab/Page
 │      │
 │      ├── Table
 │      ├── Form
 │      ├── Modal
 │      └── Pagination
 │
 └── API
       │
       ▼
google.script.run
```

## 6.3 Schema

Schema menjadi metadata utama:

```text
                Schema
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
     Table       Form    Validator
       │          │          │
       └──────────┼──────────┘
                  ▼
              Generic CRUD
```

---

# 7. GAS File Architecture

Google Apps Script tidak memiliki physical folders seperti project filesystem biasa.

Karena itu struktur module direpresentasikan melalui **naming convention**.

## Backend

```text
00_Config.gs
01_App.gs
02_Response.gs
03_Utils.gs

10_Database.gs
11_Repository.gs
12_Validator.gs

20_UserRepository.gs
21_UserService.gs
22_UserController.gs

30_ProductRepository.gs
31_ProductService.gs
32_ProductController.gs
```

## Frontend

```text
Main.html
Styles.html
Scripts.html
API.html

Tab_Dashboard.html
Tab_Users.html
Tab_Products.html

Component_Table.html
Component_Form.html
Component_Modal.html
Component_Pagination.html
Component_Toast.html
Component_Loading.html
Component_PageHeader.html
```

Naming convention bukan sekadar kosmetik.

Naming harus membantu AI dan manusia memahami architectural role setiap file.

---

# 8. Schema System

Schema adalah salah satu bagian terpenting framework.

Contoh:

```js
const UserSchema = {
  resource: 'users',
  sheet: 'Users',
  idField: 'id',

  columns: [
    {
      key: 'id',
      label: 'ID',
      type: 'text'
    },
    {
      key: 'name',
      label: 'Nama',
      type: 'text',
      searchable: true,
      sortable: true
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email',
      searchable: true
    },
    {
      key: 'status',
      label: 'Status',
      type: 'badge'
    },
    {
      key: 'created_at',
      label: 'Dibuat',
      type: 'date'
    }
  ],

  form: {
    fields: [
      {
        key: 'name',
        label: 'Nama',
        type: 'text',
        required: true
      },
      {
        key: 'email',
        label: 'Email',
        type: 'email',
        required: true
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          {
            value: 'active',
            label: 'Active'
          },
          {
            value: 'inactive',
            label: 'Inactive'
          }
        ]
      }
    ]
  }
};
```

Schema dapat menjadi source of truth untuk:

- Table
- Form
- Validation
- CRUD metadata
- Spreadsheet mapping
- Searchable fields
- Sortable fields
- Field type
- Label
- Form configuration

---

# 9. Generic CRUD

Framework wajib menyediakan:

```text
findAll
findById
create
update
delete
```

Generic Repository:

```js
Repository.findAll(schema)
Repository.findById(schema, id)
Repository.create(schema, data)
Repository.update(schema, id, data)
Repository.delete(schema, id)
```

Entity-specific Repository hanya dibuat jika terdapat behavior khusus yang tidak dapat direpresentasikan oleh generic Repository.

Jangan membuat:

```text
UserRepository
ProductRepository
OrderRepository
```

yang hanya menduplikasi generic CRUD.

---

# 10. Database Layer

Database module bertanggung jawab terhadap Spreadsheet-specific behavior.

Tanggung jawab:

- membuka Spreadsheet
- mencari Sheet
- membaca headers
- melakukan header mapping
- membaca rows
- menulis rows
- update rows
- delete rows
- batch operations
- Spreadsheet-specific errors

Module lain tidak boleh mengetahui detail cell coordinates.

Hindari penyebaran:

```js
row[0]
row[1]
row[2]
```

di seluruh aplikasi.

Gunakan:

```text
Spreadsheet headers
       ↓
Header mapping
       ↓
Object
```

Contoh:

```js
{
  id: 'USR-000001',
  name: 'John',
  email: 'john@example.com',
  status: 'active'
}
```

---

# 11. Repository Layer

Repository bertanggung jawab terhadap data access behavior.

Repository tidak boleh bertanggung jawab terhadap:

- UI
- HTML
- toast
- modal
- frontend state
- presentation
- business workflow yang tidak berkaitan dengan data access

Repository menggunakan Database layer.

```text
Service
  ↓
Repository
  ↓
Database
```

---

# 12. Service Layer

Service bertanggung jawab terhadap application/business workflow.

Contoh:

```text
create user
update product
activate user
deactivate user
```

Service dapat menggabungkan:

- validation
- repository calls
- business rules
- transaction-like workflow
- concurrency protection bila dibutuhkan

Service tidak boleh mengakses DOM.

Service tidak boleh menggunakan:

```js
document
window
HTMLElement
```

---

# 13. Controller Layer

Controller adalah entry point server yang dipanggil frontend.

Controller bertanggung jawab terhadap:

- menerima request
- memanggil Service
- menghasilkan standardized response
- menangani error di boundary server

Controller tidak boleh mengandung seluruh business logic.

Contoh:

```text
Frontend
   ↓
usersList()
   ↓
UserService
   ↓
Repository
```

---

# 14. Response Standard

Semua server operation menggunakan format konsisten.

Success:

```js
{
  success: true,
  data: ...,
  message: "..."
}
```

Failure:

```js
{
  success: false,
  data: null,
  message: "...",
  errors: {}
}
```

Frontend tidak boleh perlu memahami berbagai format response berbeda.

---

# 15. Validation

Validation harus centralized.

Minimal mendukung:

```text
required
string
number
email
min
max
minLength
maxLength
```

Client validation digunakan untuk UX.

Server validation adalah authoritative validation.

Idealnya validation dapat memanfaatkan Schema.

Contoh:

```text
Schema
   ↓
Validation rules
   ↓
Validator
```

---

# 16. ID Generation

Framework harus mendukung automatic ID generation.

Contoh:

```text
USR-000001
USR-000002

PRD-000001
PRD-000002
```

ID generation harus:

- centralized
- predictable
- collision-resistant
- protected terhadap concurrent create

Jangan membuat setiap entity memiliki algoritma ID yang berbeda kecuali memang diperlukan oleh domain.

---

# 17. Timestamp

Framework mendukung:

```text
created_at
updated_at
```

Behavior:

### Create

```text
created_at = now
updated_at = now
```

### Update

```text
created_at = unchanged
updated_at = now
```

Timestamp tidak boleh bergantung pada frontend.

---

# 18. Concurrency

Gunakan `LockService` ketika terdapat risiko concurrent modification.

Contoh:

```text
Create
   ↓
Generate ID
   ↓
Write
```

Jika operasi tersebut rentan race condition, gunakan lock yang sesuai.

Jangan menggunakan lock secara membabi buta.

Tujuannya adalah melindungi shared state yang memang membutuhkan concurrency control.

---

# 19. Frontend API

Frontend tidak boleh menyebarkan direct `google.script.run`.

Hindari:

```js
google.script.run
  .withSuccessHandler(...)
  .withFailureHandler(...)
  .getUsers(...)
```

di banyak file.

Gunakan adapter:

```js
API.users.list()
API.users.get(id)
API.users.create(data)
API.users.update(id, data)
API.users.delete(id)
```

API bertanggung jawab terhadap:

- Promise conversion
- success handling
- failure handling
- response normalization
- server function mapping

---

# 20. Table Engine

Table harus generic.

Contoh:

```js
Table.create({
  target: 'users-table',
  data: users,
  columns: UserSchema.columns,
  pagination: {
    enabled: true,
    pageSize: 10
  },
  actions: ['edit', 'delete']
});
```

Table harus mendukung:

- rendering
- column configuration
- sorting
- search
- filtering
- pagination
- row actions
- empty state
- loading state
- error state

Table tidak boleh mengetahui konsep bisnis tertentu.

Hindari:

```js
if (resource === 'users')
if (resource === 'products')
```

untuk behavior yang seharusnya generic.

---

# 21. Form Engine

Form harus generic.

Mendukung:

```text
text
number
email
date
datetime
select
checkbox
textarea
```

Mode:

```text
create
edit
view
```

Form harus mendukung:

- render berdasarkan configuration
- populate data
- validation
- submit
- cancel
- loading
- error state

Contoh:

```js
Form.create({
  schema: UserSchema,
  mode: 'create'
});
```

---

# 22. Modal

Modal harus generic dan reusable.

Modal tidak boleh mengandung business-specific behavior.

Contoh:

```text
Modal
 ├── User Form
 ├── Product Form
 └── Order Form
```

---

# 23. Pagination

Pagination harus reusable.

Pagination menerima:

```text
currentPage
pageSize
totalItems
onPageChange
```

Pagination tidak boleh mengetahui entity.

---

# 24. Search & Sorting

Search dan sorting sebaiknya dikontrol oleh configuration.

Contoh:

```js
{
  key: 'name',
  searchable: true,
  sortable: true
}
```

Table tidak perlu mengetahui apakah field berasal dari User atau Product.

---

# 25. Toast & Loading

Framework menyediakan:

```text
Toast.success()
Toast.error()
Toast.info()

Loading.show()
Loading.hide()
```

Tujuannya adalah menyediakan UI feedback yang konsisten.

---

# 26. Main Application Shell

`Main.html` menjadi application shell.

Tanggung jawab:

- navigation
- page container
- global components
- application initialization
- global UI state

Contoh:

```text
Main
 ├── Dashboard
 ├── Users
 ├── Products
 └── Orders
```

---

# 27. Page / Tab Architecture

Setiap business page memiliki HTML sendiri.

Contoh:

```text
Tab_Users.html
Tab_Products.html
Tab_Orders.html
```

Page bertanggung jawab terhadap orchestration.

Page tidak boleh mengimplementasikan ulang generic Table/Form/Modal logic.

Contoh:

```text
Tab_Users
    ↓
UserSchema
    ↓
Table
Form
Modal
API
```

---

# 28. Component Architecture

Component yang reusable:

```text
Component_Table.html
Component_Form.html
Component_Modal.html
Component_Pagination.html
Component_Toast.html
Component_Loading.html
Component_PageHeader.html
```

Component harus:

- generic
- configuration-driven
- entity-agnostic
- memiliki interface yang sederhana
- menyembunyikan implementation complexity

---

# 29. Include System

Gunakan helper:

```js
function include(filename) {
  return HtmlService
    .createTemplateFromFile(filename)
    .evaluate()
    .getContent();
}
```

`Main.html` dapat menggabungkan:

```text
Styles
Scripts
API
Components
Tabs
```

---

# 30. Architecture Deepening System

Framework harus memiliki proses architecture review.

Tujuan review bukan mencari sebanyak mungkin refactor.

Tujuannya adalah menemukan module yang:

- shallow
- memiliki interface terlalu kompleks
- bocor ke module lain
- sulit diuji
- memiliki locality buruk
- memiliki leverage rendah
- menyebarkan knowledge yang seharusnya terlokalisasi

---

# 31. Deletion Test

Sebelum membuat module baru, lakukan deletion test:

> Jika module ini dihapus, apakah complexity menjadi lebih terkonsentrasi dan lebih mudah dipahami, atau hanya berpindah tempat?

Jika hanya berpindah tempat, module tersebut kemungkinan tidak memberikan deepening yang nyata.

---

# 32. Architecture Review Process

Proses:

```text
Explore
   ↓
Identify friction
   ↓
Find shallow modules
   ↓
Apply deletion test
   ↓
Generate candidates
   ↓
Visual HTML report
   ↓
User selects candidate
   ↓
Grilling
   ↓
Design alternatives
   ↓
Architectural decision
   ↓
Implementation
   ↓
Verification
```

---

# 33. Architecture Review Scope

Review dapat fokus pada:

```text
Database
Repository
Service
Controller
Schema
Validator
API
Table
Form
Modal
Page
Application Shell
```

atau cross-cutting concerns:

```text
Performance
Concurrency
Testing
AI navigability
Error handling
Configuration
```

---

# 34. Architecture Review Report

Review harus menghasilkan HTML report di temporary directory.

Filename:

```text
architecture-review-<timestamp>.html
```

Report menggunakan:

```text
Tailwind CDN
Mermaid CDN
```

Jika diagram lebih cocok dibuat menggunakan custom HTML/CSS/SVG, gunakan custom visualization.

---

# 35. Candidate Format

Setiap candidate memiliki:

### Files

File yang terdampak.

### Problem

Masalah arsitektur yang nyata.

### Solution

Arah deepening.

### Benefits

Dalam konteks:

- locality
- leverage
- depth
- testability
- AI navigability

### Before

Visualisasi architecture sekarang.

### After

Visualisasi architecture setelah deepening.

### Recommendation Strength

Salah satu:

```text
Strong
Worth exploring
Speculative
```

Tidak menggunakan numeric score.

---

# 36. Grilling

Setelah user memilih candidate, jangan langsung implementasi.

Grilling harus mengeksplor:

```text
Constraints
Dependencies
Current seam
Desired seam
Hidden complexity
Interface
Testing
Migration
Performance
Concurrency
```

Pertanyaan utama:

- Complexity apa yang sebenarnya disembunyikan?
- Apakah module menjadi lebih deep?
- Apakah interface menjadi lebih sederhana?
- Apakah locality meningkat?
- Apakah leverage meningkat?
- Apakah testing menjadi lebih mudah?
- Apakah Spreadsheet coupling berkurang?
- Apakah frontend/server coupling berkurang?
- Apakah AI lebih mudah menavigasi perubahan?
- Apakah abstraction ini benar-benar dibutuhkan?

---

# 37. Design Twice

Jika terdapat lebih dari satu desain yang masuk akal, buat minimal dua alternatif.

Contoh:

```text
Design A
Schema-driven architecture

Design B
Entity adapter architecture
```

Bandingkan:

- depth
- locality
- leverage
- testability
- complexity
- performance
- GAS constraints
- migration cost
- AI navigability

Jangan memilih secara otomatis tanpa keputusan arsitektural yang jelas.

---

# 38. Performance Requirements

Spreadsheet API adalah resource yang relatif mahal.

Framework harus:

- batch reads
- batch writes
- menghindari Spreadsheet calls di loop jika tidak diperlukan
- menghindari repeated `getRange`
- menghindari repeated `getValue`
- menghindari repeated `setValue`
- memproses data di memory bila memungkinkan

Target:

```text
Read many rows
      ↓
One/batched Spreadsheet read
      ↓
In-memory processing
      ↓
One/batched Spreadsheet write
```

---

# 39. Testing Strategy

Testing harus dilakukan melalui interface/seam yang stabil.

## Database

Test:

- read
- insert
- update
- delete
- header mapping
- missing sheet
- missing header
- invalid data

## Repository

Test:

- findAll
- findById
- create
- update
- delete

## Validator

Test:

- required
- string
- number
- email
- min
- max
- minLength
- maxLength

## Table

Test:

- render
- sorting
- search
- pagination
- row actions
- empty state

## Form

Test:

- render
- populate
- validation
- submit
- error
- loading

## Integration

Test:

```text
UI
 ↓
API
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
Database
 ↓
Spreadsheet
```

---

# 40. Reference Application

Framework harus memiliki minimal dua entity untuk membuktikan reusability.

## Users

Fields:

```text
id
name
email
status
created_at
updated_at
```

## Products

Fields:

```text
id
code
name
price
stock
status
created_at
updated_at
```

Keduanya harus menggunakan generic:

```text
Repository
Validator
Table
Form
Modal
Pagination
Toast
Loading
Database
CRUD
API
```

---

# 41. Acceptance Criteria

Framework dianggap berhasil jika:

### Application

- Web App dapat dijalankan
- Main application shell tampil
- Navigation bekerja
- Dashboard tampil
- Users tampil
- Products tampil

### CRUD

- Users dapat Create
- Users dapat Read
- Users dapat Update
- Users dapat Delete
- Products dapat Create
- Products dapat Read
- Products dapat Update
- Products dapat Delete

### Reusability

Users dan Products menggunakan:

- generic CRUD
- generic Repository
- generic Table
- generic Form
- generic Modal
- generic Pagination
- generic Validator

Tidak boleh ada copy-paste generic logic.

### Table

- sorting bekerja
- search bekerja
- pagination bekerja
- row action bekerja

### Form

- create bekerja
- edit bekerja
- validation bekerja
- error state bekerja
- loading state bekerja

### Database

- header mapping bekerja
- column order dapat berubah tanpa merusak CRUD
- missing sheet ditangani
- missing header ditangani

### Data Integrity

- ID otomatis
- ID tidak collision pada concurrent create
- created_at benar
- updated_at benar

### Architecture

- Controller → Service → Repository → Database
- Main → Tab → Component → API
- Spreadsheet knowledge terlokalisasi
- google.script.run terlokalisasi
- Schema menjadi source of truth
- response standard konsisten
- tidak ada circular dependency
- generic module tetap generic

---

# 42. Definition of Done

Framework dianggap selesai apabila:

1. Generic CRUD bekerja.
2. Users dan Products bekerja.
3. Schema-driven architecture bekerja.
4. Table generic bekerja.
5. Form generic bekerja.
6. Modal generic bekerja.
7. Pagination generic bekerja.
8. Validation bekerja.
9. API abstraction bekerja.
10. Database abstraction bekerja.
11. Header mapping bekerja.
12. Automatic ID generation bekerja.
13. Timestamp bekerja.
14. Concurrency protection diterapkan jika dibutuhkan.
15. Standard response digunakan.
16. Error handling konsisten.
17. Spreadsheet calls dioptimalkan.
18. Tidak ada unnecessary dependency.
19. Tidak ada duplicate generic logic.
20. Architecture separation terjaga.
21. Tests tersedia untuk module penting.
22. AI coding agent dapat menemukan lokasi perubahan dengan jelas.
23. Architecture review dapat menemukan deepening opportunities.
24. Deepening dilakukan berdasarkan architectural friction nyata.
25. Deletion test digunakan sebelum menambah abstraction.
26. Interface hasil deepening lebih sederhana daripada complexity yang disembunyikan.
27. Dokumentasi architecture tersedia.

---

# 43. Quality Gate

Sebelum framework dianggap production-ready, lakukan review terhadap:

## Architecture

```text
Depth
Locality
Leverage
Seams
Adapters
Dependencies
```

## Backend

```text
Database
Repository
Service
Controller
Validator
Response
Error Handling
Concurrency
```

## Frontend

```text
Main
Tabs
API
Table
Form
Modal
Pagination
Toast
Loading
```

## Data

```text
Schema
Header Mapping
ID
Timestamps
Validation
```

## Performance

```text
Batch Reads
Batch Writes
Spreadsheet Calls
Lock Scope
```

## AI Navigability

Pertanyaan:

> Jika AI diminta menambahkan entity baru, apakah ia dapat menemukan file dan module yang relevan tanpa memahami seluruh framework?

Jika tidak, architecture membutuhkan deepening atau documentation improvement.

---

# 44. Guiding Principle

Framework ini tidak mengejar:

> "Sebanyak mungkin module."

Framework mengejar:

> **Sedikit module yang dalam, interface yang sederhana, locality yang kuat, leverage yang tinggi, dan complexity yang berada di tempat yang tepat.**

Prinsip utama:

```text
Simple Interface
       ↓
Deep Module
       ↓
Hidden Complexity
       ↓
High Leverage
       ↓
Strong Locality
       ↓
Better Testing
       ↓
Better AI Navigability
```

---

# 45. Final Architecture Vision

```text
                         APPLICATION
                              │
                       ┌──────┴──────┐
                       │    Main     │
                       └──────┬──────┘
                              │
                 ┌────────────┼────────────┐
                 │            │            │
              Dashboard      Users       Products
                              │            │
                              └─────┬──────┘
                                    │
                              Generic UI
                       ┌────────────┼────────────┐
                       │            │            │
                     Table         Form        Modal
                       │            │            │
                       └────────────┼────────────┘
                                    │
                                   API
                                    │
                           google.script.run
                                    │
                              Controller
                                    │
                                Service
                                    │
                               Repository
                                    │
                                Database
                                    │
                         Google Spreadsheet
                                    │
                                 Schema
                                    │
                       ┌────────────┼────────────┐
                       │            │            │
                     Table         Form       Validator
```

Framework harus terus berevolusi melalui proses:

```text
Observe
   ↓
Find friction
   ↓
Apply deletion test
   ↓
Identify deepening opportunity
   ↓
Visualize
   ↓
Grill
   ↓
Decide
   ↓
Implement
   ↓
Test
   ↓
Measure locality & leverage
```

**End State:** GAS Modular CRUD Framework yang ringan, reusable, configuration-driven, Spreadsheet-native, mudah diuji, dan cukup terstruktur untuk dikembangkan bersama AI tanpa berubah menjadi framework yang over-engineered.