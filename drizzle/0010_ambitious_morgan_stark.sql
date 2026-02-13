ALTER TABLE `employees` ADD `branch` varchar(100);--> statement-breakpoint
ALTER TABLE `employees` ADD `externalCode` varchar(50);--> statement-breakpoint
ALTER TABLE `employees` ADD `costCenter` varchar(100);--> statement-breakpoint
ALTER TABLE `employees` ADD `corporateEmail` varchar(255);--> statement-breakpoint
ALTER TABLE `employees` ADD `employmentType` enum('CLT','CLT_Comissao','Comissionado','Concursado','Contrato','Cooperado','Efetivo','Estagio','Estatutario','MenorAprendiz','JovemAprendiz','PrestadorServico','Socio','Temporario','Outro') DEFAULT 'CLT';--> statement-breakpoint
ALTER TABLE `employees` ADD `esocialMatricula` varchar(20);--> statement-breakpoint
ALTER TABLE `employees` ADD `insalubrityPercentage` enum('0','10','20','40') DEFAULT '0';