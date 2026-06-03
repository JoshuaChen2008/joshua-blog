
---
title: "Mysql笔记-进阶篇"
description: "黑马Mysql进阶篇的学习记录，记录Mysql的进阶知识"
date: 2026-04-22
accentColor: "#4891B2"
tags: ["Mysql"]
type: "note"
status: "ready"
draft: false
---


## 存储引擎
#存储引擎

`show create table account;查询建表语句`

`show engines ; 展示当前数据库支持的存储引擎`

`engine = MyIsam; 指定存储引擎`


#innoDB

兼顾高可靠性和高性能的通用存储引擎

DML操作遵循ACID模型，支持**事务**；
**行级锁**，提高并发访问性能；
支持**外键**ForEign Key约束，保证数据的完整性和正确性;


#逻辑存储结构
TableSpece 表空间
Segment 段  Page 页
Row 行
![[Pasted image 20260420153041.png]]

#MyISAM
MySql早期的默认引擎 
不支持事务，不支持外键，支持表锁，不支持行锁
访问速度快

#Memory
存在内存中，只能作为临时表或者缓存使用

内存存放，hash索引

现已被Redis取代


## 索引
#索引
帮助MySQL高效获取数据的数据结构(有序)
索引是一种数据结构

优点: 提高检索效率，降低数据库IO成本
可以降低数据排序成本，降低CPU消耗

缺点: 索引也占空间，降低了更新表的速度

#索引结构 

在存储引擎层实现，主要有B+树索引(默认)和Hash索引
innoDB不支持hash索引
> 关联: [[数据结构#二叉树|二叉树/红黑树原理]]、[[Javase/java笔记#HashMap|Java HashMap(数组+链表+红黑树)]]、[[Javase/java笔记#TreeSet|Java TreeSet(红黑树)]]、[[Javase/java笔记#链表|Java链表]] —— 索引底层数据结构与Java集合框架原理相通


MySQL进一步增强了B+数结构，形成双向链表，可以顺序读取，增强了区块间的访问性能，

特定情况下，innodb引擎会自动将B+数建立哈希表




#索引分类
聚集索引只会有一个而且必定存在

如果存在主键，主键索引就是聚集索引
如果没有主键，则以唯一索引建立聚集索引
如果都没有，则自动生成rowid作为隐藏的聚集索引
还有二级索引，可以挂对应的主键


#回表查询
先走二级索引，再回聚集索引拿到对应行的数据


#索引语法
```
//创建索引
Create (Unique/Fulltext) Index index_name ON table_name(index_col_name,...);

//查看索引
SHOW INDEX FROM table_name;

//删除索引
Drop Index index_name ON table_name;
```

`create index idx_user_name(索引名字) on tb_user(name);

`create unique index_user_phone on tb_user(phone`;

`create index id_user_pro_age_sta on tb_user(profession,age,status);`
``

#性能分析

#慢查询
`show [session/global] status 查询服务器状态信息`

慢查询日志记录默认关闭，需要自行在配置文件打开

`slow_query_log=1 慢查询打开`
`long_query_time =2 sql语句执行超过2秒就记录`

#profile
`Select @@have_profiling; 查询是否支持profile查询`


`show profile for query 16;`

#desc/explain
在任意sql语句前加上desc/explain即可查询

进行查询的时候，需要重点关注type字段和possible_keys、key、key_len、Extra;
对于type来说,
NULL>System>const>eq_ref>ref>range>index>all
NUll只返回表，不访问，最快
System只访问系统表
all是全部遍历,最慢，index对索引遍历


possible_keys 指可能用到的索引
key是指实际用到的索引，key_len指索引的长度,Extra指额外信息

`select s*,c* from student s, course c, student_course sc where sc.student_id and c.id = sc.courseid;`


#最左前缀法则
如果索引了多列(联合索引)，要遵循最左法则，否则自动会走全盘扫描，意思要从左边的索引开始

#范围查询

如果出现范围查询例如>和<，范围查询右侧的索引会失效

`select * from tb_user where profession = '软件工程` and age>30 and status = '0'; 这里status会失效



在索引列上进行运算操作，索引会失效
字符串类型字段不加引号会失效

#模糊查询
如果仅是尾部模糊不会失效，头部会失效

如果用or分割条件，要求两边都要有索引，否则失效

#数据分布影响
如果mySQL评估使用索引比全表更慢，则不使用索引

#SQL提示
可以在SQL语句中手动加入人为提示来优化操作
`explain select * from tb_user use index(idx_user_pro) where profession = '软件工程';`

`explain select * from tb_user ignore index(idx_user_pro)where profession ='软件工程`;
use 建议使用哪个索引
ignore 忽略特定指针
force 强制使用哪个指针

#覆盖索引
直接用星号或者使用超出索引范围的数据，会形成回表查询，性能慢

#前缀索引
针对字符串的优化
sub_part 
在对应字段后写(n)表示截取字符串前几个字
可以减低索引的体积

`select count(distinct email) from tb_user;`

`select count(distinct substring(email,1,10)/count(*) from tb_user;`


#单列索引 
一个索引只包含单个列
多个列是联合索引

如果存在多个查询条件，单列索引会导致一部分索引干扰mysql选择器，走全表扫描而不走索引

联合索引可以解决这个问题，而且可以建立覆盖索引，避免回表查询


#设计原则
数据量较大，例如100w左右可以建索引
几千几万条不用

检索频率高的可以建索引

针对常作为查询条件Where orderby和group操作的字段建立索引

选区分度高的列作为索引，尽量建立唯一索引

如果字符串类型字段较长可以建立前缀索引

控制索引数量，否则影响增删改效率

如果索引列不能存NULL,则用在创表的时候用NOT NULL约束他，方便优化器判断



# SQL优化

## 插入数据
#insert优化
数据量较大可以用insert批量插入，效率更高
几千条数据可以以500~1000为范围划分然后分批用insert插入

手动提交事务
如果自动提交事务，分批插入insert的时候会导致事务频繁提交，浪费性能

主键顺序插入比乱序插入效率更高

几百万的大批量数据插入可以用load导入文件
加上--local -infile可以读取客户端本地文件
`mysql --local -infile -u root -p

设置全局参数local_infile为1可以开启本地加载文件导入的开关

执行load指令
`load data local infile `/root  /sql1.log` into table 'tb_user' fileds terminated by ',' lines terminated by '\n';`

#主键优化

数据组织方式

主键乱序插入会发生页分裂

页合并
Merge_threshold 合并页的阈值
默认为页的50%

设计原则
尽量降低主键的长度
插入数据时尽量选择顺序插入
选择使用Auto_increment自增主键
尽量不要用UUID等做主键，如身份证号，因为顺序很乱
业务操作尽量不要修改主键


#order_by优化
1.Using filesort 通过表的索引或全表扫描，然后在排序缓冲区sort buffer完成排序，所有不是通过索引直接返回结果的排序都叫FileSort排序

2. Using index 通过有序索引直接返回有序数据,效率高


索引默认排序是asc升序排序，如果用desc倒序排序会额外排序,走filesort
`
尽量使用覆盖排序，根据排序字段建立合适的索引

默认排序缓冲区大小256k,如果大数据量排序可以适当增大排序缓冲区sort_buffer_size的大小，否则溢出的会在磁盘进行排序

#group_by优化
Using temporary 使用临时表 性能较低

分组操作时可以通过索引提高效率

#limit
越往后性能越低
例如limit 200000,10，需要MySQL排序前2000010的记录，其他的记录丢弃

一般分页查询的时候，通过创建覆盖索引能比较好的提升性能，可以通过覆盖索引加子查询优化

`explain select * from tb_sku t,(select id from tb_sku order by id limit 2000000,10) a where t.id=a.id`
把limit的sql看成一张表，多表联查

这个操作含义是先用只查ID的方式过滤掉不需要的200万行，锁定目标后再用精确的主键ID去获取那10行完整数据

#count优化
聚合函数

innoDB执行count时需要一行行读取然后累计

优化思路:自己计数

count(主键) 遍历表，取主键id值，返回服务层，拿到主键后再按行累加
count(字段)
if 没有not null约束, 遍历表，取值
返回服务层,判断是否为null,再计数累加

if有not约束，遍历表,取值,返回服务层，直接按行累加

count(1) innoDB引擎遍历表但不取值，直接给每一行加1，累加
count(\*) 不取值，直接服务层按行累加

count(\*)≈count(1)>count(主键)>count(字段)

#update优化
update如果不根据索引更新，就会锁住整张表，如果根据索引更新，只会锁住行
innoDB的行锁是针对索引加的锁

一旦锁表，并发性能降低



# 视图/存储过程/触发器

## 视图
一种虚拟存在的表,行和列数据来自于定义视图时用的表，称为基表

视图是封装SQL查询语句，用来简化SQL
也可以只给别人看一个表里面特定部分，提高安全性
```
//查看视图
show create view stu_v_1;
select * from stu_v_1;
//创建视图
create or replace view stu_v_1 as select id,name from student where id<=10;
;
//修改视图
alter view stu_v_1 as select id id,name from student where id<=10;
//删除视图
drop view if exists stu_v_1;
```

#视图的检查选项

用With Check Option字句，默认Cascaded (级联)

如果with cascaded check option会对向下的视图表全部检查一遍

例如v3依赖v2,只有v2加check，v2依赖v1
则v2和v1会被检查，对v3添加数据会向下传给v2的条件检查，再传给v1的条件检查

而Local则只会检查自己所在行的语句，v3传给v2后检查v2条件，再传给v1，v1不作检查

#视图的更新
要使视图课更新，需要让视图中的行与基础表中的行存在一对一的关系

如果包含聚合函数或窗口函数、Distinct、group by、having、union或者union all等会破坏表的一对一关系的函数，则无法更新

`create or replace view tb_user_v1as select name from tb_user ;`

`select s.name,s.no,c.name from student s,student_course sc, course c where sc.id = sc,studentid and sc.coursei= c.id;`


#存储过程
对一串sql语句打包起来，存储
封装，复用
可以接受参数也可以返回数据
减少网络交互，效率提升

可以用delimiter定义结束符号
```
Create Procedure 存储过程名称([参数列表]) (可无参)

begin
 sql语句
 
end;

call 存储过程名;
```

example:
```
Create procedure p1()
begin
 select count(*) from student;
 end;
 
 //调用
 call p1();
 
 //查看
 select * from database.ROUTINES where ROUTINE_SCHEMA = 'itcast'
 
 //查看定义的sql语句
 show create procedure p1;
 
 //删除
 drop procedure if exists p1;
```

## 变量
#系统变量

由MySQL服务器提供，不是用户定义的，分为
GLOBAL 全局变量 对所有会话有效SESSION 会话变量 对当前会话有效

这些参数服务器重启之后会初始化为默认值
想要不失效要在配置文件修改
`Show session/global Variables; 查看所有系统变量`
也可以用模糊匹配查找

指定则用Select @@变量名 ;

用set session 系统变量名 = 值来设置

#用户定义变量
不用提前声明，直接@变量名就可以用，仅限当前会话用
如果没赋值也可以用，但是会获取到NULL

```
//赋值
set @myname = 'itcast';
set @myage := 10;
set @mygender := '男',@myhobby :='java'

select @mycolor :='red';
//将
select count(*) into @mycount from tb_user;

//使用
select @myname,@myage,@mygender,@myhobby;

```

#局部变量
访问前要用Declare声明 局部变量范围在Begin..end块

可用作存储过程内的局部变量和输入参数
```
create procedure p2();
begin
//声明局部变量，default可以用来赋默认值
	declare stu_count int default 0;
	set set_count :=100;
	select count(*) into stu_count from student;
	select stu_count;
	
end;
```
很多时候，第二条 SQL 的执行依赖于第一条 SQL 查出来的结果。 可以把第一步查出来的值赋给一个局部变量，然后在后续的代码中反复使用它，而不需要每次都重新去查表


#if
```
IF 条件1 then
	...
Elseif 条件2 then
	...
Else ...
End if;
```

```
create procedure p3()
begin
	declare score int default 58;
	declare result varchar(10);
if score >= 85 then 
set result :='优秀';
elseif score >= 60 then
set result :='及格'
else
set result :='不及格'
end if;
select result;
end;
```

#参数
in 作为输入，默认
out作为输出
inout 两者都可以

可以在封装的SQL语句里面传入参数，不再定死参数

Create procedure 存储过程名称(in/out/inout 参数名 参数类型)
]

```
create procedure p4(in score int, out result varchar(10))

call p4(68, @result);
select @result;
```


#case函数
Case case_value
	When v1 then list1
	when v2 then list2
	else list
end case;

#while 
满足条件则循环执行SQL语句
有点像传统编程的while语法
```
//计算从1累加到n的值
create procedure p7(in n int)
begin
	declare total int default 0;
	while n>0 do
	set total := total + n;
	set n := n-1;
end while;
```

#repeat
有条件的循环控制语句，满足条件退出循环
Repeat
	SQL逻辑
	Until 条件
End Repeat;

#loop
loop 直接进入循环
leave 退出循环 Iterate 跳过当前循环剩下的语句，进入下一次序号

```
create procedure p9(in n int)
begin
	declare total int default 0;
	sum:loop
		if n<= 0 then
			leave sum;
		end if;
		
		set total := total +n;
		set n:= n-1;
	end loop sum;
end;
```

#游标 #光标 
cursor 游标
之前的局部变量只能接受单行单列的数据，如果想要接受表，则用游标

游标和普通变量有声明顺序，先普通再游标
```
//声明游标，存储查询结果集
create procedure p11(in uage int)
begin
	
//声明变量，用于后续开启游标
declare uname varchar(100);
declare upro varchar(100);

declare u_cursor cursor for select name,profession from tb_user where age <= uage;

//先创建一个表结构，如果有表先删除再创建
	drop table if exists tb_user_pro;
	create table if not exists tb_user_pro(//指定字段
	id int primary key auto_increment,
	name varchar(100),
	profession varchar(100)
	);
	
	
	//开启游标
	open u_cursor;
	while true do
		fetch u_cursor into uname,upro
		insert tb_user_pro values(null,uname,upro);
	end while;
	close u_cursoer;
end;
	
```

#条件处理程序

可以用SQLSTATE +'状态码'指定捕获某个情况时候执行什么什么操作

SQLwarning 01开头
not found 02开头
`decalre exit handler for SQLSTATE '02000'(状态码) close u_cursor;`


## 存储函数
一般可以用存储过程替代

参数必须是in类型

DeterMinisTic : 相同输入参数总产生相同结果
非确定的函数会导致主库和从库数据不一样，例如从库执行now()的时间与主库不同，声明为deterministic可以告诉数据库引擎这个函数是安全的

no sql: 不包含SQL语句
告诉引擎这个内部不包含sql语句，只做数学或者逻辑运算，不需要做查表或者锁数据的准备工作，优化性能

READS SQL DATA:包含读取数据的语句，但不包含写入数据的语句
告诉引擎这个函数包含读取数据的SQL比如select，但不会修改数据，没有任何insert等语句
如果函数声明了这个参数但是代码试图update，数据库会抛出错误
可以帮引擎明确锁的级别，优化+安全

```
create function fun1(n int)
//声明返回的数值类型
returns int DeterMinisTic
begin
	declare total int default 0;
	
	while n>0 do
		set total := total+n;
		set n := n-1;
	end while;
	return total;
end;
```

#触发器
设置触发器在update等修改数据的操作之前或者之后，触发就会执行触发器中定义的SQL语句集合，方便协助应用在数据库保证数据完整性，留下日志记录和数据校验

用别名OLD和NEW来引用发生变化的记录内容
只支持行级触发，不支持语句级触发

insert型: NEW表示已新增的数据
update型: old和new
delete:old

```
Create Trigger trigger_name
Before/after insert/update/delete

ON tbl_name For each row --行级触发器

Begin trigger_stmt;
END;

//查看触发器
SHOW TRIGGERS;
//删除
Drop TRIGGER database.trigger_name;


```

```
create trigger tb_user_insert_trigger
	after insert on tb_user for each row
begin
	insert into user_logs(id,operation,operate_time,operate_id,operate_params)VALUES
	(null,'insert',now(),new.id,context('插入数据的内容为:id=',new.id',name'new.id'))
end;
```

# 锁
锁是协调多线程和并发访问某一个资源的机制
> 关联: [[Javase/java笔记#同步代码块|Java synchronized锁]]、[[Javase/java笔记#lock锁|Java Lock锁]]、[[Javase/java笔记#死锁|Java死锁]] —— 理解Java并发锁有助于理解MySQL锁机制

分为全局锁，表级锁，行级锁

#全局锁
给整个数据库实例加锁，处于只读状态，此时事务全部被阻塞

做全库逻辑备份可以应用

`flush tables with read lock;加全局锁
`mysqldump -uroot -p1234 itcast>itcast.sql 备份文件在哪个位置`
`unlock tables; 解锁`

1.一旦加锁，业务基本停摆
2.如果是主从结构，会导致主从延迟

innoDB中可以通过 --single-transaction参数来完成不加锁的一致性数据备份
因为引擎底层是通过快照读来实现的


#表级锁
每次操作锁表，锁定粒度大，发生锁冲突概率最高，并发度最低

分为表锁，元数据锁，意向锁

#表级 
表锁分为
表共享读锁read lock和表独占写锁write lock

读锁会阻塞其他客户端的写
写锁会阻塞其他客户端的读和写

#元数据锁 *待学习*
MDL加锁过程是系统自动控制的
元数据指表结构数据所在

用来避免DML和DDL冲突

读锁和写锁互斥 

#意向锁 *待学习*
表锁在检查的时候不用检查每行数据
意向共享锁 IS 与表锁共享锁兼容,与表锁排它锁
意向排他锁 IX 与共享锁和排它锁都互斥


#行级锁 *待学习*
分为行锁，间隙锁和临键锁
> 关联: [[Javase/java笔记#多线程|Java多线程]] —— 行级锁的目的是提高并发访问性能，与Java多线程并发控制目标一致
行锁: 锁定单个行记录
间隙锁:锁定俩个索引记录之间的间隙，保证其不变，防止幻读
临键锁: 行锁和间隙锁组合

共享锁 S

排它锁 X


# InnoDB引擎

## 逻辑存储结构
#表空间
ibd文件，一个mysql实例可以对应多个表空间，索引等数据

#段
数据段，索引段和回滚段，InnoDB是索引组织表，数据段是B+树叶子节点，索引段位B+树非叶子节点，段用来管理多个区


#区
每个区大小为1M，默认情况，页大小为16k，一个区有64个连续的页

#页
innoDB存储引擎磁盘管理的最小单元，每个页大小默认16kb，为了保证连续，每次都会从磁盘多申请几个区

## 架构
InnoDB擅长事务处理，具有崩溃恢复特性

#Buffer_Pool 
缓冲池

主内存中的一个区域，可以缓存磁盘上经常操作的数据，执行crud操作的时候会优先从里面操作，如果没有数据就从磁盘加载，减少IO操作
> 关联: [[Javase/java笔记#缓冲流|Java缓冲流]] —— 都是通过缓冲区减少IO次数来提升性能

缓冲词以Page页为单位，底层采用链表数据结构管理Page

free page 空闲page
clean page 被使用但是没被修改
dirty page 脏页 被使用被修改而且数据和磁盘不一样


#Change_Buffer
更改缓冲区，针对非唯一的二级索引

自适应哈希: 如果引擎观测到在buffer中哈希会更快，会自动建立哈希索引

Log Buffer 日志缓冲区，保存要写入磁盘的Log，默认大小为16M


#磁盘空间 *待学习*

#后台线程

## 事务原理


## MVCC