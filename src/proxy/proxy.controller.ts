import {
  Controller,
  Post,
  Body,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AxiosRequestConfig, AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';

/**
 * Интерфейс для конфига прокси запроса (аналогичен AxiosRequestConfig)
 */
interface ProxyRequestConfig {
  /** HTTP метод */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** URL для запроса */
  url: string;
  /** Заголовки */
  headers?: Record<string, string>;
  /** Тело запроса (для POST, PUT, PATCH) */
  data?: any;
  /** Query параметры */
  params?: Record<string, any>;
  /** Другие параметры axios конфига */
  [key: string]: any;
}

@Controller('proxy')
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Проксирование HTTP запросов
   * Принимает конфиг axios в теле POST запроса
   * @param config - Конфигурация запроса (method, url, headers, data, params и т.д.)
   */
  @Post()
  async proxy(@Body() config: ProxyRequestConfig) {
    if (!config || !config.url) {
      throw new Error('URL обязателен для проксирования');
    }

    if (!config.method) {
      throw new Error('Method обязателен для проксирования');
    }

    try {
      const { method, url, data, params, headers, ...restConfig } = config;

      const axiosConfig: AxiosRequestConfig = {
        ...restConfig,
        headers,
        params,
      };

      this.logger.log(`Проксирование ${method} запроса: ${url}`);

      let response;
      switch (method.toUpperCase()) {
        case 'GET':
          response = await this.httpService.get(url, axiosConfig).toPromise();
          break;
        case 'POST':
          response = await this.httpService
            .post(url, data, axiosConfig)
            .toPromise();
          break;
        case 'PUT':
          response = await this.httpService
            .put(url, data, axiosConfig)
            .toPromise();
          break;
        case 'DELETE':
          response = await this.httpService
            .delete(url, axiosConfig)
            .toPromise();
          break;
        case 'PATCH':
          response = await this.httpService
            .patch(url, data, axiosConfig)
            .toPromise();
          break;
        default:
          throw new Error(`Неподдерживаемый метод: ${method}`);
      }

      return response.data;
    } catch (error) {
      this.logger.error(
        `Ошибка при проксировании запроса: ${error.message}`,
        error.stack,
      );

      // Обрабатываем ошибки от axios
      if (error.isAxiosError) {
        const axiosError = error as AxiosError;

        // Если есть ответ от сервера, возвращаем его данные
        if (axiosError.response) {
          const status =
            axiosError.response.status || HttpStatus.INTERNAL_SERVER_ERROR;
          const responseData = axiosError.response.data || {
            message: axiosError.message,
          };

          this.logger.error(
            `Ошибка от целевого сервера: ${status} - ${JSON.stringify(responseData)}`,
          );

          // Возвращаем ошибку с данными от целевого сервера
          throw new HttpException(responseData, status);
        }

        // Если нет ответа (сетевая ошибка, таймаут и т.д.)
        this.logger.error(`Сетевая ошибка: ${axiosError.message}`);
        throw new HttpException(
          {
            message: axiosError.message || 'Ошибка при проксировании запроса',
            code: 'NETWORK_ERROR',
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      // Обрабатываем другие ошибки
      throw new HttpException(
        {
          message: error.message || 'Неизвестная ошибка при проксировании',
          code: 'PROXY_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
