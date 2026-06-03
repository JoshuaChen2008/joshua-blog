---
title: "Mysql笔记-基础篇"
description: "黑马Mysql基础篇的学习记录，记录Mysql的基础语法和知识"
date: 2026-04-19
accentColor: "#4891B2"
tags: ["Mysql", "sql"]
type: "note"
status: "ready"
draft: false
---
[数据模型]
关系型数据库
基于表进行存储的数据库为关系型数据库

非关系型数据库

[SQL分类]
DDL 数据定义语言，定义数据库对象，例如数据库，表，字段

DML 操作数据语言，对数据库表中的数据进行增删改

DQL 数据查询语言 查询表中记录的数据

DCL 数据控制语言 创建数据库用户，控制数据库的访问权限

[DDL]
数据库操作

SHOW DATABASES; 展示所有数据库

CREATE DATABASE 数据库名; 展示指定数据库

USE 数据库名; 进入一个数据库

SELECT DATABASE(); 查看当前我在那个表

DROP DATABASE 数据库名; 删除数据库

表操作
SHOW TABLES; 显示所有表

CREATE TABLE 表名(字段 字段类型，字段 字段类型;创建一个表)

DESC 表名; 查看一个表

SHOW CREATE TABLE; 显示创建表
alter table 表名 Add 添加/ Modify修改 /  Change修改表名 / Drop删除 / Rename to重新命名; 

DROP TABLE 表名; 删除表

[DML]
对表中数据操作

添加数据
Insert into 表明(字段1，字段2)Values(值1，值2);

修改数据
UPDATE 表名 SET 字段1=值1,字段2=值2 Where 条件;

删除数据
Delete from 表名 were 条件;
[DQL]

基本查询：

查询多个字段

1.Select 字段1,字段2,字段3.. From 表名;

或者Selecet * From 表名; (不建议)

2.设置别名

Select 字段1 "别名1", 字段2"别名2"..From表名;

3.去重

Select Distinct 字段列表 From 表名;

[条件查询]

1.Select 字段列表 From 表明 Where 条件列表;

eg:
select * from emp where age <= 20;
查询年龄小于等于20的员工信息;

[模糊匹配]
 例如:查询姓名为2个字的员工信息
 一个下划线代表一个字符
 select * from emp where name like '\_\_';
身份最后一位是X的员工信息
~ like '%X';



[聚合函数]
将一列数据作为一个整体，进行纵向计算

例如: count 、max、min
一般作用于某一列

Select count(id) from emp; 
null不会参与计算
'


[分组查询]
Select 字段列表 From 表名 Where 条件 Group by 分组字段名 Having 分组后过滤条件

having分组后对结果进行过滤，且可以用聚合函数
Where是分组前进行过滤，不能用聚合函数

[排序查询]
Select 字段列表 From 表名 Order by 字段1 排序方式1，字段2 排序方式2;
排序方式只有俩
Asc 升序
Desc 降序

[分页查询]
Select 字段列表 From 表名 起始索引, 查询记录数;
起始索引从0开始，有点像数组
> 关联: [[Javase/java笔记#数组|Java数组]] —— 数据库分页索引和数组下标一样从0开始
起始索引=(查询页码-1) * 每页显示记录数



1.查询年龄为20,21,22,23岁的女性员工

select * from emp where gender='女' and age in (20,21,22,23);

select * from emp where gender= '男' and age between 20 and 40 and name like'\___\';

select gender, count(\*) from emp where age< 60 group by gender;

select name,age from emp where age <= 35 order by age asc,entrydate desc;

select \* from emp where gender = '男' and age between 20 and 40 order by age asc, entrydate asc limit 5;

[DQL执行顺序]
编写顺序 
Select - from - Where - group by - having - order by - limit;

执行顺序
From - Where - Group by -Having- Select - Order by - Limit;

可以通过起别名的方式来验证执行顺序

[DCL]
数据控制语言,用来管理数据库用户、控制数据库的访问权限\

用户信息，权限信息存放在mysql的user表中

查询用户:
Use mysql;
Select \* From User;

创建用户:
Create USER '用户名'@'主机名' identified by '密码'；

修改用户密码
Alter User '用户名'@'主机名' identified WITH mysql_native_password BY '新密码'；

删除用户
Drop User '用户名'@'主机名'

主机名可以用%通配，表示任何主机都可以访问

这类SQL开发人员操作的比较少，主要由DBA管理员操作


DCL权限控制

All , All privileges 所有权限
Select 查询数据 Insert 插入数据 Update 修改数据 Delect 删除数据 Alter 修改表 Drop 删除数据库/表 Create 创建数据库 表

查询权限

Show Grants For ‘用户名'@'主机名';

授予权限

Grant 权限列表 ON 数据库名.表名 TO ’用户名'@'主机名';
Revoke 权限列表 On 数据库名.表名 From  ’用户名'@'主机名';


[函数]
指一段可以直接被另一段程序调用的代码
mysql已经内置好大部分函数，仅需调用

Concat(s1,s2,sn);拼接字符串

Lower(str) 将str字符串转为小写

Upper(str) 大写

Lpad(str,n,pad)用字符串pad填充左边，n是str字符串长度

Trim 去掉字符串头部尾部的空格

substring('Hello MySQL',1,5);
从索引1开始截取前五个字符



对企业员工统一为5位数，不足5位的前面补0
对emp表中的workno操作
update emp set workno = lapd(workno,5,'0');


[数值函数]
Ceil(x)向上取整
ceil(1.1); = 2
Floor(x)向下取整
floor(1.9); = 1
Mod(x,y) 返回x/y的模
mod(6,4); = 2
Rand()返回0~1内的随机数
rand()； = 0.314241313..

Round(x,y) 四舍五入
round(2.345,2); =2.35


select lpad(round(rand()\*10000000, 0);),6,'0');


[日期函数]

Curdate() 返回当前日期
curtime() 返回当前时间

now()带年月份的时间

year , month, day; 返回对应数据

Year(now()); 返回当前年


date_add(now(),Interval 70 day);返回当前日期70天后的时间

datediff('2021-12-01','2021-11-01'); 求俩个日期之间的差值
默认用第一个时间减去第二个时间

select name, datediff(curdate(),entrydate)as 'entrydays'from emp order by desc;
查询员工入职天数并按倒序排序

[流程控制函数]
if(value,t,f)如果value为true则返回t,否则返回f

ifnull（v1,v2)如果v1不为空，返回v1,否则返回v2

Case when v1 then res1, else deafult end
如果v1为true返回res1,否则返回deafult默认值

case v1 when val1 then res1 else deafult end
如果v1的值等于val1，返回res1否则返回deafult默认值

select if(true,'OK','Error'); = OK 

ifnull('OK','Default‘)；= OK

ifnull(null,'default');=default

select name, (case workaddress when ' 北京' then '一线城市' when'上海' then'一线城市' else'二线城市' end)as '工作地址' from emp;



select id, name, 
(case when math>= 85 then '优秀' when math >= 60 then '及格' esle 不及格 end)as '数学',
english(case when math>= 85 then '优秀' when math >= 60 then '及格' esle 不及格 end)as '英语', 
chinese(case when math>= 85 then '优秀' when math >= 60 then '及格' esle 不及格 end)as '语文' 
from score;'




[约束]
作用于表中字段上的规则，用于限制存储在表中的数据
用于保证数据表中数据的正确，有效性和完整性

eg:
NOT NULL 非空约束 ，限制该字段数据不能为null
Unique 唯一约束，保证该字段所有的数据都是唯一不重复的
primary key 主键约束 一行数据的唯一标识，要求非空且唯一

如果当前已经申请过且条件不满足被拒绝后，主键会自动递增

Default 默认约束，保存数据时如果未指定该字段的值，则采用默认值
Check 检查约束 保证字段满足某一条件
Foreign Key外键约束,用来让两张表的数据之间建立连接，保证数据的一致性和完整性


Auto_Incerment 自动增长


创建user表:

create table user(
	id int primary key auto_increment comment '主键',
	name varcha(10) not null unique comment '姓名',
	age int check( age > 0 && age <= 120) comment'年龄',
	status char(1) default '1' comment '状态',
	gender chat(1) comment'性别'
)comment'用户表'

插入数据
insert into user(name,age,status,gender)vaules('Tom1','19','1','男'),('Tom2','19','1','女')

[外键约束]
![[Pasted image 20260419150850.png]]

给emp表添加外键 ，添加约束constraint  约束名为fk，设置emp表里的外键叫dept_id，references 关联父表dept中的id
alter table emp add constraint fk_emp_dept_id foreign key (dept_id) references dept(id);

删除外键

Alter table emp drop foreign key fk_emp_dept_id

[删除/更新行为]
No action / restrict 默认设定 如果有外键则不允许删除/更新

Cascade 当在父表中删除/更新对应记录时，首先检查该记录中是否有对应的外键，如果有则也删除/更新外键在子表中的记录

Set null 如果有对应外键则设置子表中该外键值为null (要求对应外键允许取null)

 Set default 如果父表有变更，子表将外键设置成一个默认的值(Mysql的lnnodb引擎不支持)

alter table emp add constraint fk_1 foreign key dept_id reference dept(id)  (on update cascade )(on delete cascade);

[多表查询]
DQL 为单表查询


1.一对多
一个部门对应多个员工，一个员工对应一个部门
在多的一方建立外键，指向1的主键

2.多对多
一个学生可以选修多门课程，一门课也可以供多个学生选择
实现：简历第三张中间表，中间表至少包含两个外键，分别关联两方主键

核心思想为用中间表维护两张表之间的关系

3.一对一
用户与用户详情的关系
实现：在任意一方加入外键，关联另外一方的主键，并且设置外键为唯一的

单表查询
select \* from emp;

多表查询 
select \* from emp, dept;
笛卡尔积 : 指两个集合A和集合B的所有组合的情况
在多表查询时，需要消除无效的笛卡尔积

消除笛卡尔积:
select * from emp, dept where emp.dept_id = dept.id;

连接查询:
内连接:查询A表和B表之间交集的数据

外连接: 左外连接: 查询左表所有数据和交集
右外连接: 左表和交集

自连接: 当前表与自身的连接查询，自连接必须用表别名


[内连接]
隐式内连接
select 字段列表 From 表1，表2 where 条件;
显示内连接
通过Inner Join ... on 连接




*查询每一个员工的姓名，及关联的部门的名称*

隐式内连接:
表结构: emp, dept
连接条件: emp.dept_id = dept.id
select * from emp.name,dept.name where emp.dept_id = dept.id;

如果表名繁琐，可以用别名简化

select e.name, d.name from emp e, dept e where e.dept_id = d.id;

显式内连接:  
select e.name,d.name  from emp e inner(可省略) join dept d on e.dept_id = d.id ;

[外连接]

*查询emp表的所有数据，和对应部门的信息(左外),其中emp有一条没关联部门*

select e.\*,d.name from emp e left outer join dept d on e.dept_id = d.id


[自连接]
将一张表看成两张表，其中表必须起别名
select a.name,b.name from emp a, emp b where a.managerid = b.id;

*查询所有员工emp及其领导的名字emp，如果员工没有领导，也需要查出来*

select a.name '员工', b.name '领导' from emp a left join emp b on a.managerid = b.id;


[联合查询]
对于union查询，就是把多次查询的结果合并起来，形成一个新的查询结果集

多张表的列数必须保持一致，字段类型也要保持一致

select 字段列表 from 表a ...
union
select 字段列表 from 表b ...;

*将薪资低于5000的员工和年龄大于50岁的员工全部查询出来*
select \* from where salary < 5000
union all
select \* from emp where age > 50;

如果要去重
把all去掉

[子查询]

有点像java的链式编程
> 关联: [[Javase/java笔记#链式编程|Java链式编程]] —— 两者都通过嵌套/链式结构逐步缩小数据范围
SQL语句中嵌套select语句，称为嵌套查询，又称子查询

可以插入 insert/update/delete/select中的任意一个
select * from t1 where col1 = (select col1 from t2)
分为标量子查询，子查询结果为单个值
列子查询 子查询结果为一列
行子查询 子查询结果为一行
表子查询 子查询结果为多行多列

[标量子查询]

返回单个值(数字，数字串，日期等)
*查询销售部所有的员工信息*

a. 查询销售部门ID
select id from dept where name = '销售部';
b.根据销售部的ID，查询员工信息
select % from emp where dept_id = 4;

组合:
select % from emp where dept_id = (select id from dept where name = '销售部');


select entrydate from emp where name = '方东白';
select * from emp where entry date > '2009-02-12';

=select * from emp where entry date >(select entrydate from emp where name = '方东白')

[列子查询]
In, 在指定集合范围内多选一
not in,不在指定集合范围内
any= some , 有任意一个满足要求即可
all 子查询返回列表的所有规则都必须满足

select id from dept where name = '销售部' or '市场部';

select * from emp where dept_id in (2,4);

=select * from emp where dept_id in (select id from dept where name = '销售部' or '市场部');

[行子查询]
常用操作符
\= 、<>、in、not in

*查询与张无忌的薪资及直属领导相同的员工信息*
select salary, managerid from emp where name ="张无忌";
select * from emp where (salary,managerid) = (select salary, managerid from emp where name ="张无忌");

[表查询]

select job,salary from emp where name = '鹿杖客' or name = '宋远桥';

*查询与鹿杖客，宋远桥的职位和薪资相同的员工信息，会作为一张表去查另一张表*
select * from emp where (job,salary)in (select job,salary from emp where name = '鹿杖客' or name = '宋远桥')

 ![[Pasted image 20260419165142.png]]

[事务]
是一组操作的集合，他是一个不可分割的工作单位，事务会把所有的操作作为一个整体一起向系统提交或撤销操作请求，即这些操作要么同时成功要么同时失败

如果中途遇到异常就会自动回滚事务，会把之前临时修改的数据恢复回去
> 关联: [[Mysql/Mysql进阶#innoDB|InnoDB引擎]] 基于事务的ACID模型实现、[[Javase/java笔记#同步代码块|Java同步代码块]] 也有类似"要么全部执行要么不执行"的原子性思想
Mysql中事务是自动提交的，当执行DML语句的时候，Mysql会立即隐式提交事务

[事务操作]
查看/设置事务提交方式
Select @@autocommit;
默认为1，自动提交

Set @@autocommit = 0;

提交事务
Commit;
回滚事务
Rollback;

开启事务
Start transaction / Begin;
提交事务
Commit;
回滚事务
Rollback;

[ACID]
事务的四大特性
原子性，一致性，持久性，隔离性

1.原子性 Atomicity
事务是不可分割的最小操作单元，要么全部成功，要么全部失败

2.一致性 Consistency
事务完成时，必须使所有数据保持一致状态

3.隔离性 Isolation
数据库系统提供的隔离机制，保证事务在不受并发操作影响的独立环节下执行

4.持久性 Durability
事务一旦提交或提交，它对数据库中数据的改变就是永久的
> 关联: [[Mysql/Mysql进阶#innoDB|InnoDB事务原理]] 深入理解ACID的底层实现机制



[并发事务问题]
1.脏读
一个事务读到另外一个事务还没提交的数据

2.不可重复读
一个事物先后读取同一条记录，但俩次读取的数据不同

3.幻读
一个事务按照条件查询数据，没有对应数据行，但是在插入数据时，又发现这行数据已经存在，好像出现幻影
> 关联: [[Mysql/Mysql进阶#锁|MySQL锁机制]] —— 通过行级锁（间隙锁+临键锁）防止幻读，[[Javase/java笔记#死锁|Java死锁]] —— 并发事务的锁竞争也可能导致数据库死锁

[事务隔离级别]
Read uncommitted 读未提交 性能最高
有全部的3个并发问题

Read committed 读已提交(Oracle默认) 
解决脏读问题

Repeatable Read (Mysql默认) 可重复读
解决脏读和不可重复读问题

Serializable 串行化
在并发事务中只有当A提交完成后B才能提交事务
全部解决3个并发问题，但是性能最差

查看事务隔离级别
Select @@transaction_isolation;

设置事务隔离级别
Set session (当前会话)| global transactioon isolation level 四种事务;





