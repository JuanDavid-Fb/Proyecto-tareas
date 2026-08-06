create database if not exists todo_db;
use todo_db;

create table if not exists task(
    id int primary key auto_increment,
    titulo varchar(225) not null,
    descripcion text,
    is_completed tinyint(1) default 0,
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp on update current_timestamp
) engine=InnoDB; 

select * from task;