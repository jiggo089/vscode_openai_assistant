CREATE TABLE  stg_excel.point2 (
client_name varchar(15) NULL,
age numeric(9, 0) NULL,
    key_hash varchar(80) NULL,
    value_hash varchar(80) NULL,
    valid_from_dt timestamp(0) NULL,
    valid_to_dt timestamp(0) NULL,
    valid_st int2 NULL,
    inserted_dt timestamp(0) NULL,
    updated_dt timestamp(0) NULL,
    inserted_by varchar(40) NULL,
    updated_by varchar(40) NULL

)
WITH (
	appendonly=true,
	compresstype=zstd,
	compresslevel=3,
	orientation=column
);